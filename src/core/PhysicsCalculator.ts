/**
 * PhysicsCalculator - 连续物理参数计算器
 * 从熨烫参数计算连续物理参数（0~1），驱动统一渲染函数做连续插值
 */

import type { IroningPhysics, Point } from '@/types/game';

/** sigmoid 函数 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** 限制到 [0, 1] */
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * 计算局部热量图
 * 对每个网格坐标，根据与轨迹点的距离和密度计算 localHeat(0~1)
 */
function buildHeatMap(
  trajectory: Point[],
  boardWidth: number,
  boardHeight: number,
): Map<string, number> {
  const heatMap = new Map<string, number>();
  if (trajectory.length === 0) return heatMap;

  // 统计每个格子被轨迹点覆盖的密度
  const density = new Map<string, number>();
  let maxDensity = 0;

  for (const p of trajectory) {
    // 每个轨迹点影响周围 3x3 区域，权重随距离衰减
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const cx = Math.floor(p.x) + dx;
        const cy = Math.floor(p.y) + dy;
        if (cx < 0 || cx >= boardWidth || cy < 0 || cy >= boardHeight) continue;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const weight = Math.max(0, 1 - dist / 3); // 距离3以内有权重
        const key = `${cx},${cy}`;
        const current = density.get(key) ?? 0;
        const newVal = current + weight;
        density.set(key, newVal);
        if (newVal > maxDensity) maxDensity = newVal;
      }
    }
  }

  // 归一化到 [0, 1]
  if (maxDensity > 0) {
    for (const [key, val] of density) {
      heatMap.set(key, clamp01(val / maxDensity));
    }
  }

  return heatMap;
}

/**
 * 主函数：从熨烫参数计算连续物理参数
 */
export function calculatePhysics(
  temperature: number,
  duration: number,
  trajectory: Point[],
  boardWidth: number,
  boardHeight: number,
  uniformity: number,
  riskScore: number,
): IroningPhysics {
  // === fusion（融合度）===
  // rawHeat = (temperature / 10) * min(duration / 5, 2)
  const rawHeat = (temperature / 10) * Math.min(duration / 5, 2);
  let fusion = sigmoid((rawHeat - 0.3) * 5) * (0.5 + uniformity * 0.5);
  fusion = clamp01(fusion);

  // === burnLevel（烧焦程度）===
  const tempExcess = Math.max(0, (temperature - 7) / 3);
  const timeExcess = Math.max(0, (duration - 3) / 12);
  let burnLevel = clamp01(tempExcess * (0.5 + timeExcess * 0.5));

  // === collapseAmount（坍塌量）===
  let collapseAmount = clamp01(
    Math.pow(
      Math.max(0, (temperature - 7) / 3) * Math.max(0, (duration - 6) / 9),
      1.5,
    ),
  );

  // === stickyStretch（粘连拉伸）===
  // 粘连发生在中等温度+中等时间：豆子已融合但揭开时被拉扯
  // 门槛降低到 fusion > 0.35（只要开始融合就可能粘连）
  let stickyStretch = 0;
  if (fusion > 0.35 && burnLevel < 0.3 && collapseAmount < 0.3) {
    const riskFactor = clamp01(riskScore / 100);
    const unevenness = 1 - uniformity;
    stickyStretch = clamp01(riskFactor * 0.5 + unevenness * 0.5);
  }

  // === heatMap（局部热量）===
  const heatMap = buildHeatMap(trajectory, boardWidth, boardHeight);

  // === 后处理约束 ===

  // fusion < 0.3 → burnLevel/collapseAmount/stickyStretch 全归零
  if (fusion < 0.3) {
    burnLevel = 0;
    collapseAmount = 0;
    stickyStretch = 0;
  }

  // stickyStretch > 0.1 → fusion 至少 0.65（粘连意味着豆子已经融合了）
  if (stickyStretch > 0.1) {
    fusion = Math.max(fusion, 0.65);
  }

  // burnLevel > 0.3 → fusion 至少 0.8（烧焦意味着已经充分融合）
  if (burnLevel > 0.3) {
    fusion = Math.max(fusion, 0.8);
  }

  // collapseAmount > 0.5 → stickyStretch 衰减
  if (collapseAmount > 0.5) {
    stickyStretch *= 1 - (collapseAmount - 0.5) * 2;
    stickyStretch = clamp01(stickyStretch);
  }

  // 派生参数
  const holeVisibility = 1 - fusion;
  const gapSize = 1 - fusion;

  return {
    fusion,
    holeVisibility,
    burnLevel,
    collapseAmount,
    stickyStretch,
    gapSize,
    heatMap,
  };
}
