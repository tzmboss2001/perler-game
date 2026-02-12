/**
 * 拼豆3D模板类型定义
 * 基于「拼豆设计模板 + 算法工具链」体系 v1.0
 */

// 模板分类
export type TemplateCategory =
  | 'character'   // 人物
  | 'animal'      // 动物
  | 'vehicle'     // 车辆
  | 'building'    // 建筑
  | 'object'      // 物品
  | 'text_logo';  // 文字/LOGO

// 难度级别
export type DifficultyLevel = 'basic' | 'standard' | 'advanced';

// 风格
export type TemplateStyle =
  | 'pixel_plain'     // 方正平直
  | 'pixel_round'     // 层级圆润
  | 'chibi_big_head'  // 大头身小
  | 'blocky_vehicle'; // 硬朗车体

// 3D坐标
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// 分辨率
export interface Resolution {
  x: number;  // 宽度
  y: number;  // 高度（正面看的上下）
  z: number;  // 深度（层数）
}

// 形状定义 - 球体
export interface SphereShape {
  type: 'sphere';
  name: string;
  center: [number, number, number];  // [x, y, z]
  radius: number;
  slot: string;  // 语义槽位
}

// 形状定义 - 椭球体
export interface EllipsoidShape {
  type: 'ellipsoid';
  name: string;
  center: [number, number, number];  // [x, y, z]
  radii: [number, number, number];   // [rx, ry, rz]
  slot: string;
}

// 形状定义 - 长方体
export interface BoxShape {
  type: 'box';
  name: string;
  min: [number, number, number];  // 最小角
  max: [number, number, number];  // 最大角
  slot: string;
}

// 形状定义 - 圆柱体
export interface CylinderShape {
  type: 'cylinder';
  name: string;
  center: [number, number, number];
  radius: number;
  height: number;
  axis: 'x' | 'y' | 'z';  // 轴向
  slot: string;
}

// 所有形状类型
export type TemplateShape = SphereShape | EllipsoidShape | BoxShape | CylinderShape;

// 区域定义
export interface TemplateRegion {
  name: string;
  z_range?: [number, number];  // Z轴范围
  y_range?: [number, number];  // Y轴范围
  x_range?: [number, number];  // X轴范围
}

// 参数定义
export interface TemplateParam {
  min: number;
  max: number;
  default: number;
  description?: string;
}

// 颜色槽定义
export interface ColorSlotDef {
  default: string;      // 默认颜色 hex
  description?: string;
}

// 约束规则
export interface TemplateConstraints {
  min_support_neighbors: number;  // 最小支撑邻居数
  max_overhang: number;           // 最大悬挑
  min_layer_area_ratio: number;   // 最小层面积比
}

// 完整模板定义
export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  resolution: Resolution;
  difficulty: DifficultyLevel;
  style: TemplateStyle;
  description?: string;

  // 形状定义（用于生成体素）
  shapes: TemplateShape[];

  // 语义区域
  regions: TemplateRegion[];

  // 可调参数
  params: Record<string, TemplateParam>;

  // 颜色槽位
  color_slots: Record<string, ColorSlotDef>;

  // 槽位到颜色的映射
  slot_to_color: Record<string, string>;

  // 约束规则
  constraints: TemplateConstraints;
}

// 展开后的体素
export interface TemplateVoxel {
  x: number;
  y: number;
  z: number;
  slot: string;       // 语义槽位
  color?: string;     // 填充的颜色（hex）
  colorIndex?: number; // 拼豆色号
}

// 展开后的体素模型
export interface ExpandedTemplate {
  template: Template;
  voxels: TemplateVoxel[];
  dimensions: Resolution;
}

// 用户参数输入
export interface UserParams {
  [key: string]: number;
}

// 用户颜色输入
export interface UserColors {
  [slot: string]: string;  // slot -> hex color
}

// 模板实例化配置
export interface TemplateInstanceConfig {
  templateId: string;
  params?: UserParams;
  colors?: UserColors;
}
