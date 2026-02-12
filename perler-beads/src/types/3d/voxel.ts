/**
 * 3D拼豆体素相关类型定义
 */

// 单个体素
export interface Voxel {
  x: number;      // X坐标
  y: number;      // Y坐标
  z: number;      // Z坐标（层数）
  color: string;  // 颜色hex
  beadId: string; // 对应的拼豆色号
}

// 体素模型
export interface VoxelModel {
  width: number;   // X方向尺寸
  height: number;  // Y方向尺寸
  depth: number;   // Z方向尺寸（层数）
  voxels: Voxel[]; // 所有体素
}

// 单层数据（用于逐层图纸）
export interface Layer {
  z: number;       // 层号（从0开始，0=底层）
  width: number;   // 该层宽度
  height: number;  // 该层高度
  beads: LayerBead[]; // 该层的珠子
}

// 层内珠子
export interface LayerBead {
  x: number;
  y: number;
  color: string;
  beadId: string;
  beadName?: string;
}

// 深度图数据
export interface DepthData {
  width: number;
  height: number;
  pixels: number[][]; // 0-255 深度值，255=最近，0=最远
}

// 3D生成配置
export interface Generate3DConfig {
  maxDepth: number;      // 最大层数（1-10）
  gridWidth: number;     // 像素化宽度
  depthThreshold: number; // 深度阈值（低于此值视为背景）
  mode: '浮雕' | '完整3D';
}

// 深度估计API响应
export interface DepthEstimationResult {
  success: boolean;
  depthImageUrl?: string;  // 灰度深度图URL
  colorDepthUrl?: string;  // 彩色深度图URL（可选）
  error?: string;
}

// 珠子统计
export interface BeadStats3D {
  totalCount: number;
  layerCount: number;
  colorStats: {
    beadId: string;
    beadName: string;
    color: string;
    count: number;
  }[];
}
