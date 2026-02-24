/**
 * BoardRemovalEngine - 去钉板物理引擎
 * 管理钉板提起过程中的卡住/带出判定
 */

import type { RemovalState, Bead } from '@/types/game';

/** 创建初始去钉板状态 */
export function createRemovalState(): RemovalState {
  return {
    liftHeight: 0,
    tiltAngle: 0,
    liftSpeed: 0,
    stuckBeadKeys: [],
    pulledBeadKeys: [],
    completed: false,
  };
}

/**
 * 预先计算哪些豆子会卡在钉板上
 * 边角豆子 5-15% 概率卡住
 */
export function calculateStuckBeads(
  beads: Map<string, Bead>,
  boardWidth: number,
  boardHeight: number,
): string[] {
  const stuck: string[] = [];

  for (const [key, bead] of beads) {
    // 边角判定：距离边缘 ≤ 2 格
    const isEdge = bead.x <= 1 || bead.x >= boardWidth - 2 ||
                   bead.y <= 1 || bead.y >= boardHeight - 2;
    // 角落判定
    const isCorner = (bead.x <= 1 || bead.x >= boardWidth - 2) &&
                     (bead.y <= 1 || bead.y >= boardHeight - 2);

    let stuckProb = 0.02; // 基础 2%
    if (isCorner) {
      stuckProb = 0.15; // 角落 15%
    } else if (isEdge) {
      stuckProb = 0.08; // 边缘 8%
    }

    if (Math.random() < stuckProb) {
      stuck.push(key);
    }
  }

  return stuck;
}

/**
 * 更新去钉板状态
 * @param state 当前状态
 * @param newHeight 新的提起高度 0~1
 * @param tiltAngle 倾斜角度（弧度，正=右倾，负=左倾）
 * @param dt 时间差
 */
export function updateRemovalState(
  state: RemovalState,
  newHeight: number,
  tiltAngle: number,
  dt: number,
): RemovalState {
  const clampedHeight = Math.max(0, Math.min(1, newHeight));
  const liftSpeed = dt > 0 ? Math.abs(clampedHeight - state.liftHeight) / dt : 0;

  return {
    ...state,
    liftHeight: clampedHeight,
    tiltAngle,
    liftSpeed,
    completed: clampedHeight >= 0.95,
  };
}

/**
 * 计算被带出（拉走）的豆子
 * 条件：卡住 + 速度 > 0.5 → stuckForce * speed * 0.8
 * 速度 < 0.2 → 不带出（慢慢提可以安全分离）
 * 歪着拉 → 倾斜侧带出概率 +30%
 */
export function calculatePulledBeads(
  stuckBeadKeys: string[],
  beads: Map<string, Bead>,
  liftSpeed: number,
  tiltAngle: number,
  boardWidth: number,
): string[] {
  if (liftSpeed < 0.2) return []; // 慢提不带出

  const pulled: string[] = [];
  const centerX = boardWidth / 2;

  for (const key of stuckBeadKeys) {
    const bead = beads.get(key);
    if (!bead) continue;

    let pullProb = liftSpeed * 0.8; // 基础概率

    // 歪着拉的惩罚
    if (Math.abs(tiltAngle) > 0.1) {
      // 判断豆子在倾斜侧
      const isOnTiltSide = (tiltAngle > 0 && bead.x > centerX) ||
                            (tiltAngle < 0 && bead.x < centerX);
      if (isOnTiltSide) {
        pullProb += 0.3; // 倾斜侧 +30%
      }
    }

    pullProb = Math.min(pullProb, 0.9);

    if (Math.random() < pullProb) {
      pulled.push(key);
    }
  }

  return pulled;
}

/**
 * 完成去钉板过程的最终计算
 */
export function finalizeRemoval(
  stuckBeadKeys: string[],
  beads: Map<string, Bead>,
  avgSpeed: number,
  maxTilt: number,
  boardWidth: number,
): { pulledKeys: string[]; safeKeys: string[] } {
  const pulled = calculatePulledBeads(stuckBeadKeys, beads, avgSpeed, maxTilt, boardWidth);
  const pulledSet = new Set(pulled);
  const safeKeys = stuckBeadKeys.filter((k) => !pulledSet.has(k));

  return { pulledKeys: pulled, safeKeys };
}
