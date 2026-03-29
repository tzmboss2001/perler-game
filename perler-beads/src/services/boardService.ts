/**
 * 拼豆板智能配置服务
 *
 * 2.6mm 小豆方形钉板规格体系：
 * - 小板: 26×26 钉
 * - 标准板: 52×52 钉（最常用）
 * - 大板: 104×104 钉
 */

/** 板子规格定义 */
export interface BoardSpec {
  size: number;       // 钉数（单边）
  label: string;      // 显示名称
  shortLabel: string; // 短名称
}

/** 板子规格常量 */
export const BOARD_SPECS: BoardSpec[] = [
  { size: 26,  label: '小板 (26×26)',   shortLabel: '小板' },
  { size: 52,  label: '标准板 (52×52)', shortLabel: '标准板' },
  { size: 104, label: '大板 (104×104)', shortLabel: '大板' },
];

/** 智能推荐结果 */
export interface BoardRecommendation {
  /** 推荐使用的板子规格（钉数） */
  boardSize: number;
  /** 板子规格名称 */
  boardLabel: string;
  /** 水平方向需要几块板 */
  cols: number;
  /** 垂直方向需要几块板 */
  rows: number;
  /** 总共需要几块板 */
  totalBoards: number;
  /** 简短描述，如 "1块标准板" / "2×3=6块小板" */
  summary: string;
  /** 是否需要拼接 */
  needSplice: boolean;
}

/** 现实豆板分区线规则 */
export interface PhysicalBoardGuideSpec {
  boardSize: number;
  segments: number[];
}

/**
 * 现实常见方板的分区规则。
 * 54 板：2 / 10 / 10 / 10 / 10 / 10 / 2
 * 78 板：4 / 10 / 10 / 10 / 10 / 10 / 10 / 10 / 4
 * 104 板：2 / 10 × 10 / 2
 */
export const PHYSICAL_BOARD_GUIDE_SPECS: PhysicalBoardGuideSpec[] = [
  { boardSize: 54, segments: [2, 10, 10, 10, 10, 10, 2] },
  { boardSize: 78, segments: [4, 10, 10, 10, 10, 10, 10, 10, 4] },
  { boardSize: 104, segments: [2, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 2] },
];

/**
 * 为制作模式返回现实豆板画线所用的基准板尺寸。
 * 小于等于 54 用 54 板；小于等于 78 用 78 板；更大的作品统一按 104 板重复。
 */
export function getPhysicalBoardDrawSize(width: number, height: number): number {
  const longestSide = Math.max(width, height);
  if (longestSide <= 54) return 54;
  if (longestSide <= 78) return 78;
  return 104;
}

/**
 * 计算单块现实豆板内部的分区线偏移位置。
 * 只返回内部线，不包含 0 和 boardSize 本身。
 */
export function getPhysicalBoardGuideOffsets(boardSize: number): number[] {
  const spec = PHYSICAL_BOARD_GUIDE_SPECS.find((item) => item.boardSize === boardSize);
  if (!spec) {
    return [];
  }

  const offsets: number[] = [];
  let cursor = 0;
  for (const segment of spec.segments) {
    cursor += segment;
    if (cursor > 0 && cursor < boardSize) {
      offsets.push(cursor);
    }
  }
  return offsets;
}

/**
 * 智能推荐拼豆板配置
 *
 * 策略：
 * 1. 能用单块板放下 → 选最小的够用的板
 * 2. 需要拼接 → 选能最小化板子数量的规格
 * 3. 同等数量下优先选大板（拼接次数少）
 */
export function recommendBoard(width: number, height: number): BoardRecommendation {
  // 尝试每种板子规格，找最优方案
  let bestOption: BoardRecommendation | null = null;

  for (const spec of BOARD_SPECS) {
    const cols = Math.ceil(width / spec.size);
    const rows = Math.ceil(height / spec.size);
    const total = cols * rows;
    const needSplice = total > 1;

    let summary: string;
    if (total === 1) {
      summary = `1块${spec.shortLabel}`;
    } else if (cols === 1 || rows === 1) {
      summary = `${total}块${spec.shortLabel}拼接`;
    } else {
      summary = `${cols}×${rows}=${total}块${spec.shortLabel}`;
    }

    const option: BoardRecommendation = {
      boardSize: spec.size,
      boardLabel: spec.label,
      cols,
      rows,
      totalBoards: total,
      summary,
      needSplice,
    };

    // 选择策略：
    // 1. 优先不拼接
    // 2. 同为不拼接 → 选最小够用的板（省钱省空间）
    // 3. 同为需拼接 → 板子数量少 > 同数量选大板（拼接缝少）
    if (!bestOption) {
      bestOption = option;
    } else if (!option.needSplice && bestOption.needSplice) {
      // 新方案不需要拼接，旧方案需要 → 选新方案
      bestOption = option;
    } else if (option.needSplice && !bestOption.needSplice) {
      // 旧方案不需要拼接，保持旧方案
    } else if (!option.needSplice && !bestOption.needSplice) {
      // 都不需要拼接 → 选最小的板（更经济）
      if (option.boardSize < bestOption.boardSize) {
        bestOption = option;
      }
    } else {
      // 都需要拼接
      if (option.totalBoards < bestOption.totalBoards) {
        bestOption = option;
      } else if (option.totalBoards === bestOption.totalBoards && option.boardSize > bestOption.boardSize) {
        // 同数量，大板拼接缝更少
        bestOption = option;
      }
    }
  }

  return bestOption!;
}

/**
 * 获取所有板子方案供用户选择（用于导出分页等场景）
 * 返回每种板子规格的拼接方案，按推荐度排序
 */
export function getAllBoardOptions(width: number, height: number): BoardRecommendation[] {
  const options: BoardRecommendation[] = [];

  for (const spec of BOARD_SPECS) {
    const cols = Math.ceil(width / spec.size);
    const rows = Math.ceil(height / spec.size);
    const total = cols * rows;
    const needSplice = total > 1;

    let summary: string;
    if (total === 1) {
      summary = `1块${spec.shortLabel}`;
    } else if (cols === 1 || rows === 1) {
      summary = `${total}块${spec.shortLabel}拼接`;
    } else {
      summary = `${cols}×${rows}=${total}块${spec.shortLabel}`;
    }

    options.push({
      boardSize: spec.size,
      boardLabel: spec.label,
      cols,
      rows,
      totalBoards: total,
      summary,
      needSplice,
    });
  }

  // 按推荐度排序：不拼接优先 > 板子数少 > 大板优先
  options.sort((a, b) => {
    if (a.needSplice !== b.needSplice) return a.needSplice ? 1 : -1;
    if (a.totalBoards !== b.totalBoards) return a.totalBoards - b.totalBoards;
    return b.boardSize - a.boardSize;
  });

  return options;
}
