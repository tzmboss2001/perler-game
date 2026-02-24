/**
 * 真实5mm拼豆(Midi Bead)物理规格
 * 所有比率基于钉距(CELL)为基准单位
 */

// === 真实物理尺寸(mm) ===
export const REAL_MM = {
  pegSpacing: 5.0,      // 钉距（中心到中心）
  beadOuterDiam: 5.0,   // 豆子外径
  beadInnerDiam: 2.5,   // 豆子内孔径
  beadHeight: 5.0,      // 豆子高度
  pegDiam: 2.5,         // 钉柱直径
  pegHeight: 4.5,       // 钉柱高度
  boardPegs: 29,        // 标准方板每边钉数
} as const;

// === 渲染比率（相对于 CELL） ===
// 豆子外径略小于钉距，因为圆柱体有轻微倒角
export const BEAD_R_RATIO = 0.48;     // beadRadius / cell
export const HOLE_R_RATIO = 0.25;     // holeRadius / cell
export const PEG_R_RATIO = 0.22;      // pegRadius / cell (比孔略小，留装配间隙)

// === 便捷函数：从 cell 像素大小计算各部件像素大小 ===
export function beadSpec(cell: number) {
  return {
    beadR: cell * BEAD_R_RATIO,
    holeR: cell * HOLE_R_RATIO,
    pegR: cell * PEG_R_RATIO,
  };
}
