/**
 * 云拼豆游戏 - 核心类型定义
 */

// 珠子状态
export type BeadState = 'raw' | 'melted' | 'burned' | 'collapsed';

// 单个拼豆
export interface Bead {
  x: number;
  y: number;
  color: string;
  colorId: string;
  state: BeadState;
}

// 拼豆画布
export interface BeadBoard {
  width: number;
  height: number;
  beads: Map<string, Bead>;
  templateId?: string;
}

// 坐标点
export interface Point {
  x: number;
  y: number;
}

// 熨烫参数
export interface IroningParams {
  temperature: number; // 温度 1-10
  duration: number;    // 时间（秒）
  trajectory: Point[]; // 熨烫轨迹
  pressure: number;    // 压力（预留）
}

// 失败类型
export type FailureType =
  | 'undercooked'   // 半生不熟
  | 'partial_melt'  // 局部融化
  | 'collapse'      // 整体塌陷
  | 'burned'        // 颜色烧焦
  | 'sticky';       // 粘连拉扯

// 翻车报告
export interface FailureReport {
  title: string;
  description: string;
  tips: string[];
  score: number;       // 评分 0-100
  shareImage?: string;
}

// 熨烫结果
export interface IroningResult {
  success: boolean;
  riskScore: number;
  failureType?: FailureType;
  affectedBeads: Bead[];
  report: FailureReport;
}

// 游戏阶段
export type GamePhase = 'selecting' | 'placing' | 'ironing' | 'result';

// 画布尺寸选项
export interface BoardSizeOption {
  width: number;
  height: number;
  label: string;
}

export const BOARD_SIZE_OPTIONS: BoardSizeOption[] = [
  { width: 15, height: 15, label: '小 (15×15)' },
  { width: 20, height: 20, label: '中 (20×20)' },
  { width: 29, height: 29, label: '大 (29×29)' },
];

// 模板分类
export type TemplateCategory = 'animal' | 'fruit' | 'shape' | 'character';

// 模板难度
export type TemplateDifficulty = 'easy' | 'medium' | 'hard';

// 模板拼豆数据
export interface TemplateBead {
  x: number;
  y: number;
  color: string;    // hex 颜色
  colorId: string;  // 颜色库 id
}

// 模板定义
export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  width: number;
  height: number;
  difficulty: TemplateDifficulty;
  beads: TemplateBead[];
}
