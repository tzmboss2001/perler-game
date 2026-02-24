/**
 * 体素化服务
 * 将深度图 + 原图转换为3D体素模型
 */

import { Voxel, VoxelModel, DepthData, Generate3DConfig } from '../../types/3d/voxel';
import { findClosestBeadColorLabWithVibrancy } from '../colorMatchService';
import { allBeadColors, BeadColor } from '../../data/beadColors';

/**
 * 将图片和深度数据转换为体素模型
 * @param imageDataUrl 原始图片的 data URL
 * @param depthData 深度数据
 * @param config 生成配置
 * @returns 体素模型
 */
export async function imageToVoxels(
  imageDataUrl: string,
  depthData: DepthData,
  config: Generate3DConfig
): Promise<VoxelModel> {
  // 1. 像素化原图到目标尺寸
  const pixelatedImage = await pixelateImage(imageDataUrl, config.gridWidth);

  // 2. 像素化深度图到相同尺寸
  const pixelatedDepth = pixelateDepthData(depthData, pixelatedImage.width, pixelatedImage.height);

  // 3. 生成体素
  const voxels: Voxel[] = [];
  const { maxDepth, depthThreshold } = config;

  for (let y = 0; y < pixelatedImage.height; y++) {
    for (let x = 0; x < pixelatedImage.width; x++) {
      const colorIndex = (y * pixelatedImage.width + x) * 4;
      const r = pixelatedImage.data[colorIndex];
      const g = pixelatedImage.data[colorIndex + 1];
      const b = pixelatedImage.data[colorIndex + 2];
      const a = pixelatedImage.data[colorIndex + 3];

      // 跳过透明像素
      if (a < 128) continue;

      // 获取深度值
      const depth = pixelatedDepth[y][x];

      // 跳过背景（深度低于阈值）
      if (depth < depthThreshold) continue;

      // 计算该像素的层数（深度映射到层数）
      // depth: 0-255, 层数: 1 到 maxDepth
      const layerCount = Math.max(1, Math.ceil((depth / 255) * maxDepth));

      // 匹配拼豆颜色
      const rgb: [number, number, number] = [r, g, b];
      const matchedBead: BeadColor = findClosestBeadColorLabWithVibrancy(rgb, allBeadColors, 0.3);

      // 为每一层创建体素
      for (let z = 0; z < layerCount; z++) {
        voxels.push({
          x,
          y,
          z,
          color: matchedBead.hex,
          beadId: matchedBead.id,
        });
      }
    }
  }

  // 计算模型尺寸
  const maxZ = voxels.length > 0 ? Math.max(...voxels.map(v => v.z)) + 1 : 0;

  return {
    width: pixelatedImage.width,
    height: pixelatedImage.height,
    depth: maxZ,
    voxels,
  };
}

/**
 * 像素化图片
 */
async function pixelateImage(
  imageDataUrl: string,
  targetWidth: number
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // 计算目标高度，保持宽高比
      const aspectRatio = img.height / img.width;
      const targetHeight = Math.round(targetWidth * aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      // 使用最近邻插值（像素化效果）
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

      resolve({
        width: targetWidth,
        height: targetHeight,
        data: imageData.data,
      });
    };

    img.onerror = () => {
      reject(new Error('加载图片失败'));
    };

    img.src = imageDataUrl;
  });
}

/**
 * 像素化深度数据
 */
function pixelateDepthData(
  depthData: DepthData,
  targetWidth: number,
  targetHeight: number
): number[][] {
  const result: number[][] = [];

  const scaleX = depthData.width / targetWidth;
  const scaleY = depthData.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < targetWidth; x++) {
      // 计算源区域
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcX2 = Math.min(Math.floor((x + 1) * scaleX), depthData.width);
      const srcY2 = Math.min(Math.floor((y + 1) * scaleY), depthData.height);

      // 计算区域平均深度
      let sum = 0;
      let count = 0;
      for (let sy = srcY; sy < srcY2; sy++) {
        for (let sx = srcX; sx < srcX2; sx++) {
          sum += depthData.pixels[sy][sx];
          count++;
        }
      }

      row.push(count > 0 ? Math.round(sum / count) : 0);
    }
    result.push(row);
  }

  return result;
}

/**
 * RGB转Hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/**
 * 获取模型的某一层数据
 */
export function getLayer(model: VoxelModel, z: number): Voxel[] {
  return model.voxels.filter(v => v.z === z);
}

/**
 * 计算体素模型的统计信息
 */
export function calculateVoxelStats(model: VoxelModel): {
  totalVoxels: number;
  layerCount: number;
  colorCounts: Map<string, { beadId: string; color: string; count: number }>;
} {
  const colorCounts = new Map<string, { beadId: string; color: string; count: number }>();

  for (const voxel of model.voxels) {
    const existing = colorCounts.get(voxel.beadId);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(voxel.beadId, {
        beadId: voxel.beadId,
        color: voxel.color,
        count: 1,
      });
    }
  }

  return {
    totalVoxels: model.voxels.length,
    layerCount: model.depth,
    colorCounts,
  };
}
