/**
 * 缩略图生成 + 数据格式转换工具
 */

import { BeadPixelData } from './colorMatchService';

// 社区格式的珠子数据
interface CommunityBeadData {
  width: number;
  height: number;
  beads: { x: number; y: number; colorId: string; hex?: string; brand?: string }[];
}

/**
 * BeadPixelData -> 社区格式
 */
export function convertBeadPixelDataToCommunityFormat(data: BeadPixelData): CommunityBeadData {
  const beads: { x: number; y: number; colorId: string; hex?: string; brand?: string }[] = [];
  for (let i = 0; i < data.beads.length; i++) {
    const bead = data.beads[i];
    if (bead) {
      beads.push({
        x: i % data.width,
        y: Math.floor(i / data.width),
        colorId: bead.id,
        hex: bead.hex,
        brand: bead.brand,
      });
    }
  }
  return { width: data.width, height: data.height, beads };
}

export interface PaletteMeta {
  palette_brand: 'mard' | 'perler' | 'hama' | 'artkal' | 'mixed' | 'unknown';
  palette_version: string;
  palette_name: string;
}

const PALETTE_VERSION = '2026-03';

export function inferPaletteMetaFromBeadData(data: BeadPixelData): PaletteMeta {
  const brandCount = new Map<string, number>();

  for (const bead of data.beads) {
    if (!bead) continue;
    const brand = bead.brand || 'unknown';
    brandCount.set(brand, (brandCount.get(brand) || 0) + 1);
  }

  if (brandCount.size === 0) {
    return {
      palette_brand: 'unknown',
      palette_version: PALETTE_VERSION,
      palette_name: `UNKNOWN ${PALETTE_VERSION}`,
    };
  }

  const sorted = Array.from(brandCount.entries()).sort((a, b) => b[1] - a[1]);
  const topBrand = sorted[0][0] as PaletteMeta['palette_brand'];
  const mixed = sorted.length > 1;
  const finalBrand: PaletteMeta['palette_brand'] = mixed ? 'mixed' : topBrand;
  const display = finalBrand.toUpperCase();

  return {
    palette_brand: finalBrand,
    palette_version: PALETTE_VERSION,
    palette_name: `${display} ${PALETTE_VERSION}`,
  };
}

/**
 * 从 BeadPixelData 生成缩略图 base64
 * 保持原图案像素样式，仅做等比缩放，不改变颜色与形状
 */
export function generateThumbnailFromBeadData(data: BeadPixelData, maxSize = 512): string {
  const { width, height, beads } = data;

  if (width <= 0 || height <= 0) return '';

  // 先按“每颗珠子=1像素”绘制原始图案，保证色块形态不变
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d')!;
  const sourceImage = sourceCtx.createImageData(width, height);
  const pixels = sourceImage.data;

  for (let i = 0; i < beads.length; i += 1) {
    const bead = beads[i];
    if (!bead) continue; // 保持透明像素

    const pixelIndex = i * 4;
    const hex = bead.hex.replace('#', '');
    if (hex.length !== 6) continue;

    pixels[pixelIndex] = parseInt(hex.slice(0, 2), 16);
    pixels[pixelIndex + 1] = parseInt(hex.slice(2, 4), 16);
    pixels[pixelIndex + 2] = parseInt(hex.slice(4, 6), 16);
    pixels[pixelIndex + 3] = 255;
  }
  sourceCtx.putImageData(sourceImage, 0, 0);

  // 等比缩放到 maxSize，关闭平滑，保持像素风格
  const scale = Math.max(1, Math.floor(maxSize / Math.max(width, height)));
  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = width * scale;
  targetCanvas.height = height * scale;
  const targetCtx = targetCanvas.getContext('2d')!;
  targetCtx.imageSmoothingEnabled = false;
  targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
  targetCtx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);

  return targetCanvas.toDataURL('image/png');
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
