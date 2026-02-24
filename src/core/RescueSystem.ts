/**
 * RescueSystem - 失败抢救系统
 * 熨烫翻车后的第二次机会
 */

import type { FailureType, RescueOption, RescueResult, IroningResult } from '@/types/game';
import type { BeadBoard } from './BeadBoard';

/** 各失败类型的抢救方案 */
const RESCUE_OPTIONS: Record<string, RescueOption> = {
  undercooked: {
    type: 'undercooked',
    method: '再烫一下',
    operation: '快速补烫3秒，让拼豆融合',
    maxScore: 70,
    duration: 3,
  },
  partial_melt: {
    type: 'partial_melt',
    method: '补烫边缘',
    operation: '点击未融合的区域进行补烫',
    maxScore: 60,
    duration: 4,
  },
  burned: {
    type: 'burned',
    method: '降温冷却',
    operation: '拖动冷却滑条降低温度',
    maxScore: 50,
    duration: 3,
  },
  sticky: {
    type: 'sticky',
    method: '慢慢揭开',
    operation: '缓慢向上拖拽揭开拼豆',
    maxScore: 55,
    duration: 4,
  },
};

/** 判断是否可以抢救 */
export function canRescue(failureType?: FailureType): boolean {
  if (!failureType) return false;
  // collapse 不可抢救
  return failureType !== 'collapse';
}

/** 获取抢救方案 */
export function getRescueOption(failureType: FailureType): RescueOption | null {
  return RESCUE_OPTIONS[failureType] || null;
}

/** 执行抢救 - 根据完成度计算结果 */
export function executeRescue(
  failureType: FailureType,
  completionRate: number, // 0-1，玩家操作完成度
): RescueResult {
  const option = RESCUE_OPTIONS[failureType];
  if (!option) {
    return { success: false, newScore: 0, description: '无法抢救' };
  }

  // 完成度 >= 0.6 视为抢救成功
  const success = completionRate >= 0.6;
  const baseScore = success ? option.maxScore : Math.round(option.maxScore * 0.3);
  const newScore = Math.round(baseScore * Math.max(completionRate, 0.3));

  const description = success
    ? `抢救成功！${option.method}奏效了`
    : `抢救失败...${option.method}没能完全挽回`;

  return { success, newScore, description };
}

/** 将抢救效果应用到画板 - 部分恢复拼豆状态 */
export function applyRescueToBoard(
  board: BeadBoard,
  failureType: FailureType,
  completionRate: number,
): void {
  const allBeads = board.getAllBeads();
  const restoreRatio = Math.min(completionRate, 0.8); // 最多恢复80%

  switch (failureType) {
    case 'undercooked':
      // 补烫后部分拼豆融合
      for (const bead of allBeads) {
        if (Math.random() < restoreRatio) {
          bead.state = 'melted';
        }
      }
      break;

    case 'partial_melt':
      // 补烫边缘后更多区域融合
      for (const bead of allBeads) {
        if (bead.state === 'raw' && Math.random() < restoreRatio) {
          bead.state = 'melted';
        }
      }
      break;

    case 'burned':
      // 冷却后颜色部分恢复（无法完全恢复）
      // burned 效果已经改了颜色，这里不做颜色还原，只改状态
      for (const bead of allBeads) {
        if (Math.random() < restoreRatio * 0.5) {
          bead.state = 'melted';
        }
      }
      break;

    case 'sticky':
      // 慢慢揭开后减少粘连
      for (const bead of allBeads) {
        if (bead.state === 'melted' && Math.random() < restoreRatio) {
          bead.state = 'melted'; // 保持融合态但不再粘连变形
        }
      }
      break;
  }
}
