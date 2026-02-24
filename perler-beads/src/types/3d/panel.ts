/**
 * 面板拼接模式类型定义
 * 将3D模型拆解为6个面板，通过凹凸卡槽垂直拼接
 */

/** 面板对应的立方体面 */
export type PanelFace = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right';

/** 面板边缘位置 */
export type EdgePosition = 'top' | 'bottom' | 'left' | 'right';

/** 卡槽类型：凹或凸 */
export type SlotType = 'concave' | 'convex';

/** 单个卡槽单元 */
export interface SlotUnit {
  startPos: number;    // 沿边缘的起始位置（珠子索引）
  length: number;      // 分组长度（珠子数）
  type: SlotType;      // 凹或凸
  depth: number;       // 深度（珠子数）
}

/** 单个面板 */
export interface FacePanel {
  id: string;                       // "Panel-Front" 等
  face: PanelFace;
  baseWidth: number;                // 原始投影宽度（不含凹凸扩展）
  baseHeight: number;               // 原始投影高度（不含凹凸扩展）
  width: number;                    // 含凹凸的总宽
  height: number;                   // 含凹凸的总高
  pixels: (string | null)[][];      // [row][col] = color or null
  edgeSlots: Record<EdgePosition, SlotUnit[]>;
  beadCount: number;
}

/** 边缘连接关系 */
export interface EdgeConnection {
  panelA: PanelFace;
  panelAEdge: EdgePosition;
  panelB: PanelFace;
  panelBEdge: EdgePosition;
  edgeLength: number;
}

/** 面板拼接总结果 */
export interface PanelAssemblyResult {
  panels: FacePanel[];
  edges: EdgeConnection[];
  assemblyOrder: PanelFace[];
  stats: {
    totalPanels: number;
    totalBeads: number;
    panelBreakdown: { face: PanelFace; beadCount: number }[];
  };
}

/** 面板拼接配置 */
export interface PanelAssemblyConfig {
  slotGroupSize: number;     // 凹凸分组大小（默认3）
  slotDepth: number;         // 槽深度（默认2）
  panelThickness: number;    // 面板厚度（默认1）
  enabledFaces: PanelFace[]; // 启用的面（默认全部6面）
}

/** 面板拼接配置默认值 */
export const DEFAULT_PANEL_CONFIG: PanelAssemblyConfig = {
  slotGroupSize: 3,
  slotDepth: 2,
  panelThickness: 1,
  enabledFaces: ['top', 'bottom', 'front', 'back', 'left', 'right'],
};
