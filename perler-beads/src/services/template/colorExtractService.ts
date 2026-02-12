/**
 * 颜色提取服务
 * 从用户图片中提取主色，用于填充模板颜色槽
 */

import { Template, UserColors, TemplateRegion } from '../../types/template';

/**
 * 颜色信息
 */
interface ColorInfo {
  hex: string;
  r: number;
  g: number;
  b: number;
  count: number;
}

/**
 * 从图片提取颜色数据
 */
export async function loadImageData(imageDataUrl: string): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve({
        data: imageData.data,
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imageDataUrl;
  });
}

/**
 * 检测前景蒙版（透明或接近四角颜色的为背景）
 */
export function detectForegroundMask(
  data: Uint8ClampedArray,
  width: number,
  height: number
): boolean[][] {
  const mask: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  // 获取四角颜色（用于检测背景）
  const corners = [
    getPixelColor(data, width, 0, 0),
    getPixelColor(data, width, width - 1, 0),
    getPixelColor(data, width, 0, height - 1),
    getPixelColor(data, width, width - 1, height - 1),
  ];

  // 计算四角的平均颜色作为背景参考
  const bgColor = {
    r: Math.round(corners.reduce((s, c) => s + c.r, 0) / 4),
    g: Math.round(corners.reduce((s, c) => s + c.g, 0) / 4),
    b: Math.round(corners.reduce((s, c) => s + c.b, 0) / 4),
  };

  // 颜色差异阈值
  const threshold = 50;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];

      // 透明像素是背景
      if (a < 128) {
        mask[y][x] = false;
        continue;
      }

      // 计算与背景色的差异
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const diff = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);

      mask[y][x] = diff > threshold;
    }
  }

  return mask;
}

/**
 * 获取像素颜色
 */
function getPixelColor(data: Uint8ClampedArray, width: number, x: number, y: number): { r: number; g: number; b: number } {
  const idx = (y * width + x) * 4;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
  };
}

/**
 * 从区域中提取主色（K-means简化版）
 */
function extractDominantColors(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mask: boolean[][],
  yStart: number,
  yEnd: number,
  topN: number = 3
): ColorInfo[] {
  // 颜色计数（量化到32级）
  const colorCounts = new Map<string, ColorInfo>();
  // 修复：确保量化后的值不超过255
  const quantize = (v: number) => Math.min(255, Math.round(v / 8) * 8);

  for (let y = yStart; y < yEnd && y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y]?.[x]) continue;

      const idx = (y * width + x) * 4;
      const r = quantize(data[idx]);
      const g = quantize(data[idx + 1]);
      const b = quantize(data[idx + 2]);
      const key = `${r},${g},${b}`;

      if (colorCounts.has(key)) {
        colorCounts.get(key)!.count++;
      } else {
        colorCounts.set(key, {
          r, g, b,
          hex: rgbToHex(r, g, b),
          count: 1,
        });
      }
    }
  }

  // 按数量排序，返回前N个
  return Array.from(colorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * RGB转Hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * 按模板区域提取颜色
 * 根据模板的regions定义，从用户图片中提取对应区域的主色
 */
export async function extractColorsForTemplate(
  imageDataUrl: string,
  template: Template
): Promise<UserColors> {
  const { data, width, height } = await loadImageData(imageDataUrl);
  const mask = detectForegroundMask(data, width, height);

  const colors: UserColors = {};

  // 简化方案：直接从整个前景提取主要颜色
  const allColors = extractDominantColors(data, width, height, mask, 0, height, 10);

  console.log('提取的颜色:', allColors);

  // 过滤掉太接近白色或黑色的颜色
  const filteredColors = allColors.filter(c => {
    const brightness = (c.r + c.g + c.b) / 3;
    return brightness > 30 && brightness < 240; // 排除太暗和太亮的颜色
  });

  console.log('过滤后的颜色:', filteredColors);

  // 按亮度排序，找出主色（通常是中等亮度的颜色）
  const sortedByBrightness = [...filteredColors].sort((a, b) => {
    const brightA = (a.r + a.g + a.b) / 3;
    const brightB = (b.r + b.g + b.b) / 3;
    return brightB - brightA; // 从亮到暗
  });

  // 最主要的颜色（数量最多的非极端颜色）
  const primaryColor = filteredColors[0]?.hex || allColors[0]?.hex || '#888888';

  // 次要颜色（较亮的颜色，用于肚子等）
  const secondaryColor = sortedByBrightness[0]?.hex || primaryColor;

  // 深色（用于鼻子、眼睛）
  const darkColors = allColors.filter(c => (c.r + c.g + c.b) / 3 < 80);
  const darkColor = darkColors[0]?.hex || '#2f1810';

  // 填充所有颜色槽
  for (const [slot, def] of Object.entries(template.color_slots)) {
    if (slot === 'fur_primary' || slot === 'skin' || slot === 'cloth_primary') {
      colors[slot] = primaryColor;
    } else if (slot === 'fur_secondary' || slot === 'belly' || slot === 'inner_ear') {
      colors[slot] = secondaryColor;
    } else if (slot === 'nose' || slot === 'eyes') {
      colors[slot] = darkColor;
    } else if (slot === 'hair' || slot === 'cloth_secondary' || slot === 'shoe') {
      // 如果有第二主色就用，否则用主色
      colors[slot] = filteredColors[1]?.hex || primaryColor;
    } else {
      colors[slot] = def.default;
    }
  }

  console.log('最终颜色槽:', colors);
  return colors;
}

/**
 * 简化版：提取图片整体主色（用于快速测试）
 */
export async function extractMainColors(
  imageDataUrl: string,
  topN: number = 5
): Promise<ColorInfo[]> {
  const { data, width, height } = await loadImageData(imageDataUrl);
  const mask = detectForegroundMask(data, width, height);
  return extractDominantColors(data, width, height, mask, 0, height, topN);
}
