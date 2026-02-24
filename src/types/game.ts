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
  | 'sticky'        // 粘连拉扯
  | 'bead_drop'     // 翻转/去钉板时掉豆
  | 'tape_fail'     // 胶带未贴好导致大面积掉落
  | 'paper_gap';    // 烘焙纸覆盖不全导致烧焦

// 翻车报告
export interface FailureReport {
  title: string;
  description: string;
  tips: string[];
  score: number;       // 评分 0-100
  shareImage?: string;
}

// 熨烫物理参数（连续渐变驱动渲染）
export interface IroningPhysics {
  fusion: number;          // 融合度 0=圆形分离 → 1=方块无缝
  holeVisibility: number;  // 中孔可见度 = 1 - fusion
  burnLevel: number;       // 烧焦程度 0=原色 → 1=焦黑
  collapseAmount: number;  // 坍塌收缩 0=原位 → 1=收缩到中心
  stickyStretch: number;   // 粘连拉伸 0=无变形 → 1=极端拉伸
  gapSize: number;         // 间隙大小 = 1 - fusion
  heatMap?: Map<string, number>; // 每颗豆子的局部热量(0~1)，key="x,y"
}

// 熨烫结果
export interface IroningResult {
  success: boolean;
  riskScore: number;
  failureType?: FailureType;
  affectedBeads: Bead[];
  report: FailureReport;
  physics: IroningPhysics;
}

// 游戏阶段
export type GamePhase =
  | 'selecting'   // 选择画布/模板
  | 'placing'     // 放置拼豆
  | 'taping'      // 贴美纹纸
  | 'flipping'    // 翻转钉板
  | 'removing'    // 去除钉板
  | 'papering'    // 铺烘焙纸
  | 'ironing'     // 熨烫
  | 'rescuing'    // 抢救
  | 'result';     // 结果

// ==================== 贴美纹纸相关 ====================

/** 一条胶带 */
export interface TapeStrip {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;       // 胶带宽度（网格单位）
  pressure: number;    // 按压力度 0~1（慢拖=重压=1，快拖=轻按=低值）
}

/** 贴胶带结果 */
export interface TapingResult {
  strips: TapeStrip[];
  coverage: number;         // 总覆盖率 0~1
  avgPressure: number;      // 平均按压力度
  weakAreas: Point[];       // 按压不实的区域
  uncoveredAreas: Point[];  // 未覆盖的区域
}

// ==================== 翻转相关 ====================

/** 翻转状态 */
export interface FlipState {
  angle: number;            // 当前角度 0~180
  angularVelocity: number;  // 角速度 rad/s
  completed: boolean;       // 是否完成翻转
  droppedBeadKeys: string[];  // 掉落的豆子 key 列表
}

// ==================== 去钉板相关 ====================

/** 去钉板状态 */
export interface RemovalState {
  liftHeight: number;       // 提起高度 0~1
  tiltAngle: number;        // 倾斜角度（弧度）
  liftSpeed: number;        // 提起速度
  stuckBeadKeys: string[];  // 卡住的豆子
  pulledBeadKeys: string[]; // 被带出的豆子
  completed: boolean;
}

// ==================== 铺烘焙纸相关 ====================

/** 烘焙纸状态 */
export interface PaperState {
  paperX: number;       // 纸张左上角 X
  paperY: number;       // 纸张左上角 Y
  paperWidth: number;   // 纸张宽度
  paperHeight: number;  // 纸张高度
  coverage: number;     // 覆盖率 0~1
}

// ==================== 过程记录 ====================

/** 每一步的结果汇总，用于结果页展示 */
export interface StepRecord {
  step: GamePhase;
  score: number;        // 该步得分 0~100
  detail: string;       // 描述
  beadsBefore: number;  // 该步前豆子数
  beadsAfter: number;   // 该步后豆子数
}

// 抢救方式
export interface RescueOption {
  type: FailureType;
  method: string;       // 抢救方式描述
  operation: string;    // 操作说明
  maxScore: number;     // 抢救后分数上限
  duration: number;     // 抢救操作时长（秒）
}

// 抢救结果
export interface RescueResult {
  success: boolean;
  newScore: number;
  description: string;
}

// 画布尺寸选项
export interface BoardSizeOption {
  width: number;
  height: number;
  label: string;
}

export const BOARD_SIZE_OPTIONS: BoardSizeOption[] = [
  { width: 15, height: 15, label: '小 (15×15 · 7.5cm)' },
  { width: 20, height: 20, label: '中 (20×20 · 10cm)' },
  { width: 29, height: 29, label: '大 (29×29 · 14.5cm)' },
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
