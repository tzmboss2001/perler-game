/**
 * TapingSystem - 胶带物理引擎
 * 管理美纹纸胶带条的放置、覆盖率计算、粘性计算
 */

import type { TapeStrip, TapingResult, Bead, Point } from '@/types/game';

let stripIdCounter = 0;

/** 创建一条新的胶带 */
export function createTapeStrip(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  dragSpeed: number,
): TapeStrip {
  // 按压力度 = 拖拽速度的反比（慢=重压，快=轻按）
  // dragSpeed 单位为 格/秒，典型范围 0.5~10
  const pressure = Math.max(0.1, Math.min(1, 1 - (dragSpeed - 0.5) / 10));

  return {
    id: `tape_${++stripIdCounter}`,
    startX,
    startY,
    endX,
    endY,
    width: 3, // 胶带宽度为3格
    pressure,
  };
}

/**
 * 计算胶带条覆盖的网格集合
 * 胶带展开为旋转矩形，用 SAT 判定覆盖格子
 */
export function getTapeCoveredCells(strip: TapeStrip, boardWidth: number, boardHeight: number): Set<string> {
  const covered = new Set<string>();
  const dx = strip.endX - strip.startX;
  const dy = strip.endY - strip.startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.5) return covered;

  // 胶带方向的单位向量
  const ux = dx / length;
  const uy = dy / length;
  // 垂直方向
  const nx = -uy;
  const ny = ux;

  const halfW = strip.width / 2;

  // 遍历可能被覆盖的格子
  const minX = Math.max(0, Math.floor(Math.min(strip.startX, strip.endX) - halfW - 1));
  const maxX = Math.min(boardWidth - 1, Math.ceil(Math.max(strip.startX, strip.endX) + halfW + 1));
  const minY = Math.max(0, Math.floor(Math.min(strip.startY, strip.endY) - halfW - 1));
  const maxY = Math.min(boardHeight - 1, Math.ceil(Math.max(strip.startY, strip.endY) + halfW + 1));

  for (let gx = minX; gx <= maxX; gx++) {
    for (let gy = minY; gy <= maxY; gy++) {
      // 格子中心
      const cx = gx + 0.5;
      const cy = gy + 0.5;
      // 相对胶带起点的偏移
      const relX = cx - strip.startX;
      const relY = cy - strip.startY;
      // 投影到胶带方向
      const proj = relX * ux + relY * uy;
      // 投影到垂直方向
      const perp = Math.abs(relX * nx + relY * ny);

      if (proj >= -0.5 && proj <= length + 0.5 && perp <= halfW) {
        covered.add(`${gx},${gy}`);
      }
    }
  }

  return covered;
}

/**
 * 计算所有胶带的总覆盖率和粘性信息
 */
export function calculateTapingResult(
  strips: TapeStrip[],
  beads: Map<string, Bead>,
  boardWidth: number,
  boardHeight: number,
): TapingResult {
  // 收集有豆子的格子
  const beadKeys = new Set(beads.keys());
  if (beadKeys.size === 0) {
    return {
      strips,
      coverage: 0,
      avgPressure: 0,
      weakAreas: [],
      uncoveredAreas: [],
    };
  }

  // 每个格子的覆盖情况
  const cellPressure = new Map<string, number>();

  for (const strip of strips) {
    const cells = getTapeCoveredCells(strip, boardWidth, boardHeight);
    for (const key of cells) {
      if (beadKeys.has(key)) {
        // 取最大按压力度
        const existing = cellPressure.get(key) || 0;
        cellPressure.set(key, Math.max(existing, strip.pressure));
      }
    }
  }

  // 统计覆盖
  const totalBeads = beadKeys.size;
  const coveredCount = cellPressure.size;
  const coverage = coveredCount / totalBeads;

  // 计算平均按压力度
  let pressureSum = 0;
  for (const p of cellPressure.values()) {
    pressureSum += p;
  }
  const avgPressure = coveredCount > 0 ? pressureSum / coveredCount : 0;

  // 按压不实区域（力度 < 0.5）
  const weakAreas: Point[] = [];
  for (const [key, p] of cellPressure) {
    if (p < 0.5) {
      const [x, y] = key.split(',').map(Number);
      weakAreas.push({ x, y });
    }
  }

  // 未覆盖区域
  const uncoveredAreas: Point[] = [];
  for (const key of beadKeys) {
    if (!cellPressure.has(key)) {
      const [x, y] = key.split(',').map(Number);
      uncoveredAreas.push({ x, y });
    }
  }

  return {
    strips,
    coverage,
    avgPressure,
    weakAreas,
    uncoveredAreas,
  };
}

/**
 * 预测翻转时掉落的豆子
 * 未覆盖的豆子 + 弱粘的豆子（概率性）
 */
export function predictDroppedBeads(
  tapingResult: TapingResult,
  beads: Map<string, Bead>,
  flipSpeed: number, // 角速度 rad/s
): string[] {
  const dropped: string[] = [];
  const beadKeys = new Set(beads.keys());

  // 建立覆盖映射
  const coveredPressure = new Map<string, number>();
  // 从 tapingResult 中的数据推算
  for (const key of beadKeys) {
    const [x, y] = key.split(',').map(Number);
    // 检查是否在未覆盖区域
    const isUncovered = tapingResult.uncoveredAreas.some(
      (p) => p.x === x && p.y === y,
    );
    if (isUncovered) {
      coveredPressure.set(key, 0);
    } else {
      // 检查是否在弱区域
      const isWeak = tapingResult.weakAreas.some(
        (p) => p.x === x && p.y === y,
      );
      coveredPressure.set(key, isWeak ? 0.3 : 1);
    }
  }

  for (const [key, pressure] of coveredPressure) {
    if (pressure === 0) {
      // 未覆盖：翻转角度 > 90° 必掉
      dropped.push(key);
    } else if (pressure < 0.5) {
      // 弱粘：按角速度概率掉落
      // 概率 = (1 - pressure) * 0.4 + flipSpeed * 0.2
      const prob = (1 - pressure) * 0.4 + Math.min(flipSpeed, 3) * 0.1;
      if (Math.random() < prob) {
        dropped.push(key);
      }
    } else {
      // 强粘：高速时边缘豆子仍可能掉
      if (flipSpeed > 2) {
        const prob = (flipSpeed - 2) * 0.05;
        if (Math.random() < prob) {
          dropped.push(key);
        }
      }
    }
  }

  return dropped;
}
