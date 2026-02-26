/**
 * 缩略图生成 + 数据格式转换工具
 */

import { BeadPixelData } from './colorMatchService';

// 社区格式的珠子数据
interface CommunityBeadData {
  width: number;
  height: number;
  beads: { x: number; y: number; colorId: string }[];
}

/**
 * BeadPixelData -> 社区格式
 */
export function convertBeadPixelDataToCommunityFormat(data: BeadPixelData): CommunityBeadData {
  const beads: { x: number; y: number; colorId: string }[] = [];
  for (let i = 0; i < data.beads.length; i++) {
    const bead = data.beads[i];
    if (bead) {
      beads.push({
        x: i % data.width,
        y: Math.floor(i / data.width),
        colorId: bead.id,
      });
    }
  }
  return { width: data.width, height: data.height, beads };
}

/**
 * 从 BeadPixelData 生成缩略图 base64
 * 使用 Canvas 绘制圆形珠子
 */
export function generateThumbnailFromBeadData(data: BeadPixelData, maxSize = 512): string {
  const { width, height, beads } = data;

  // 计算珠子大小，确保缩略图不会太大
  const cellSize = Math.max(2, Math.min(Math.floor(maxSize / Math.max(width, height)), 16));
  const canvasWidth = width * cellSize;
  const canvasHeight = height * cellSize;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // 背景色（深灰）
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const beadRadius = cellSize * 0.4;

  for (let i = 0; i < beads.length; i++) {
    const bead = beads[i];
    if (!bead) continue;

    const x = (i % width) * cellSize + cellSize / 2;
    const y = Math.floor(i / width) * cellSize + cellSize / 2;

    // 绘制圆形珠子
    ctx.beginPath();
    ctx.arc(x, y, beadRadius, 0, Math.PI * 2);
    ctx.fillStyle = bead.hex;
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

/**
 * 统计 BeadPixelData 中的珠子数量和颜色种类
 */
export function countBeadStats(data: BeadPixelData): { beadCount: number; colorCount: number } {
  let beadCount = 0;
  const colorSet = new Set<string>();

  for (const bead of data.beads) {
    if (bead) {
      beadCount++;
      colorSet.add(bead.id);
    }
  }

  return { beadCount, colorCount: colorSet.size };
}
