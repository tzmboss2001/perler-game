/**
 * FlippingEngine - 翻转物理引擎
 * 管理翻转角度、角速度、掉落判定
 */

import type { FlipState, TapingResult, Bead } from '@/types/game';

/** 创建初始翻转状态 */
export function createFlipState(): FlipState {
  return {
    angle: 0,
    angularVelocity: 0,
    completed: false,
    droppedBeadKeys: [],
  };
}

/**
 * 更新翻转角度（由手势驱动）
 * @param state 当前状态
 * @param newAngle 新角度 0~180
 * @param dt 时间差（秒）
 */
export function updateFlipAngle(
  state: FlipState,
  newAngle: number,
  dt: number,
): FlipState {
  const clampedAngle = Math.max(0, Math.min(180, newAngle));
  const angularVelocity = dt > 0
    ? Math.abs(clampedAngle - state.angle) * (Math.PI / 180) / dt
    : 0;

  return {
    ...state,
    angle: clampedAngle,
    angularVelocity,
    completed: clampedAngle >= 175,
  };
}

/**
 * 计算翻转过程中实时掉落的豆子
 * 在每帧调用，返回本帧新掉落的豆子
 */
export function calculateDroppedBeads(
  angle: number,
  angularVelocity: number,
  tapingResult: TapingResult,
  beads: Map<string, Bead>,
  boardWidth: number,
  boardHeight: number,
  alreadyDropped: Set<string>,
): string[] {
  const newDropped: string[] = [];
  const angleRad = angle * Math.PI / 180;

  for (const [key, bead] of beads) {
    if (alreadyDropped.has(key)) continue;

    // 检查该豆子的覆盖状态
    const isUncovered = tapingResult.uncoveredAreas.some(
      (p) => p.x === bead.x && p.y === bead.y,
    );
    const isWeak = tapingResult.weakAreas.some(
      (p) => p.x === bead.x && p.y === bead.y,
    );

    // 基础掉落概率
    let dropProb = 0;

    if (isUncovered) {
      // 未覆盖区域：角度 > 90° 时概率急升
      if (angle > 90) {
        dropProb = 0.02 + (angle - 90) / 90 * 0.08;
      } else if (angle > 45) {
        dropProb = 0.005;
      }
    } else if (isWeak) {
      // 弱粘区域：基于角速度概率掉落
      if (angle > 90) {
        dropProb = angularVelocity > 1.5 ? 0.01 + angularVelocity * 0.005 : 0.002;
      }
    } else {
      // 强粘区域：高速甩出
      if (angularVelocity > 2 && angle > 60) {
        // 边缘豆子更容易掉
        const cx = boardWidth / 2;
        const cy = boardHeight / 2;
        const dist = Math.sqrt((bead.x - cx) ** 2 + (bead.y - cy) ** 2);
        const maxDist = Math.sqrt(cx * cx + cy * cy);
        const edgeFactor = dist / maxDist;
        dropProb = (angularVelocity - 2) * 0.003 * edgeFactor;
      }
    }

    if (dropProb > 0 && Math.random() < dropProb) {
      newDropped.push(key);
    }
  }

  return newDropped;
}

/**
 * 完成翻转时的最终掉落计算
 * 一次性判定所有未覆盖豆子
 */
export function finalizeFlip(
  tapingResult: TapingResult,
  beads: Map<string, Bead>,
  angularVelocity: number,
  alreadyDropped: Set<string>,
): string[] {
  const finalDropped: string[] = [];

  for (const [key, bead] of beads) {
    if (alreadyDropped.has(key)) continue;

    const isUncovered = tapingResult.uncoveredAreas.some(
      (p) => p.x === bead.x && p.y === bead.y,
    );
    const isWeak = tapingResult.weakAreas.some(
      (p) => p.x === bead.x && p.y === bead.y,
    );

    if (isUncovered) {
      // 未覆盖必掉
      finalDropped.push(key);
    } else if (isWeak) {
      // 弱粘区：20-40% 掉落
      const prob = 0.2 + angularVelocity * 0.1;
      if (Math.random() < Math.min(prob, 0.4)) {
        finalDropped.push(key);
      }
    }
  }

  return finalDropped;
}

/**
 * 计算掉落豆子的抛物线轨迹
 * 返回关键帧参数用于动画
 */
export interface DropAnimation {
  key: string;
  startX: number;
  startY: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
}

export function createDropAnimation(
  beadKey: string,
  beadX: number,
  beadY: number,
  angle: number,
  angularVelocity: number,
  boardWidth: number,
): DropAnimation {
  // 掉落方向基于翻转角度
  const angleRad = angle * Math.PI / 180;
  const centerX = boardWidth / 2;
  const offsetX = beadX - centerX;

  return {
    key: beadKey,
    startX: beadX,
    startY: beadY,
    // 水平速度由惯性决定
    velocityX: offsetX * angularVelocity * 0.3,
    // 垂直速度（重力）
    velocityY: 2 + Math.random() * 3,
    // 旋转
    rotation: (Math.random() - 0.5) * angularVelocity * 2,
  };
}
