/**
 * PaperingSystem - 烘焙纸系统
 * 管理烘焙纸的放置和覆盖率计算
 */

import type { PaperState, Bead } from '@/types/game';

/** 创建初始烘焙纸状态 */
export function createPaperState(boardWidth: number, boardHeight: number): PaperState {
  return {
    paperX: 0,
    paperY: 0,
    paperWidth: boardWidth + 4, // 纸比画布大一些
    paperHeight: boardHeight + 4,
    coverage: 0,
  };
}

/**
 * 更新烘焙纸位置
 */
export function updatePaperPosition(
  state: PaperState,
  x: number,
  y: number,
): PaperState {
  return {
    ...state,
    paperX: x,
    paperY: y,
  };
}

/**
 * 计算烘焙纸对豆子的覆盖率
 */
export function calculatePaperCoverage(
  paperState: PaperState,
  beads: Map<string, Bead>,
  boardWidth: number,
  boardHeight: number,
): number {
  if (beads.size === 0) return 0;

  // 纸张覆盖范围（纸的坐标是相对于画布的偏移）
  const paperLeft = paperState.paperX;
  const paperTop = paperState.paperY;
  const paperRight = paperLeft + paperState.paperWidth;
  const paperBottom = paperTop + paperState.paperHeight;

  let covered = 0;
  for (const bead of beads.values()) {
    if (bead.x >= paperLeft && bead.x < paperRight &&
        bead.y >= paperTop && bead.y < paperBottom) {
      covered++;
    }
  }

  return covered / beads.size;
}

/**
 * 计算熨烫修正系数
 * 未覆盖区域烧焦风险 +50%
 */
export function getIroningModifier(paperCoverage: number): {
  burnRiskMultiplier: number;
  description: string;
} {
  if (paperCoverage >= 0.95) {
    return {
      burnRiskMultiplier: 1.0,
      description: '烘焙纸完全覆盖，保护良好',
    };
  }

  if (paperCoverage >= 0.7) {
    return {
      burnRiskMultiplier: 1.0 + (1 - paperCoverage) * 1.0,
      description: '烘焙纸基本覆盖，边缘有少量风险',
    };
  }

  if (paperCoverage >= 0.3) {
    return {
      burnRiskMultiplier: 1.5,
      description: '烘焙纸覆盖不足，烧焦风险增加50%',
    };
  }

  return {
    burnRiskMultiplier: 2.0,
    description: '烘焙纸严重不足，烧焦风险翻倍！',
  };
}
