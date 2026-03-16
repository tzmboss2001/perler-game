/**
 * 颜色匹配服务
 * 将像素颜色匹配到最接近的珠子颜色
 */

import {
  BeadColor,
  getColorsByBrand,
  colorDistance,
  allBeadColors,
} from '../data/beadColors';
import { PixelData } from './pixelizeService';

export interface BeadPixelData {
  width: number;
  height: number;
  beads: (BeadColor | null)[];  // 每个像素对应的珠子颜色，null 表示透明（无珠子）
}

export interface BeadStatistics {
  color: BeadColor;
  count: number;
  percentage: number;
}

export interface ColorMatchOptions {
  brand?: 'perler' | 'hama' | 'artkal';  // 可选，向后兼容
  colorCount?: number;                    // 新增：颜色数量（使用统一色库）
  excludeColors?: string[];               // 要排除的颜色ID
  maxColors?: number;                     // 最大颜色数量（合并相似颜色）
  saturationBoost?: number;               // 饱和度增强 0-100，默认 0
  useLabSpace?: boolean;                  // 使用 Lab 色彩空间匹配，默认 true
  vibrancyPreference?: number;            // 鲜艳度偏好 0-100，默认 30
  transparentThreshold?: number;          // 透明度阈值 0-255，低于此值视为透明，默认 128
}

/**
 * 将像素数据匹配到珠子颜色
 */
export const matchPixelsToBead = (
  pixelData: PixelData,
  options: ColorMatchOptions
): BeadPixelData => {
  const {
    brand,
    colorCount,
    excludeColors = [],
    saturationBoost = 0,
    useLabSpace = true,
    vibrancyPreference = 30,
    transparentThreshold = 128,  // 默认阈值：alpha < 128 视为透明
  } = options;

  // 获取可用颜色：如果指定了 colorCount，使用统一色库；否则使用品牌色库
  let availableColors = colorCount
    ? allBeadColors
    : getColorsByBrand(brand || 'artkal');

  // 排除指定颜色
  if (excludeColors.length > 0) {
    availableColors = availableColors.filter(c => !excludeColors.includes(c.id));
  }

  // 匹配每个像素
  const beads: (BeadColor | null)[] = pixelData.pixels.map((rgb, index) => {
    // 检查是否为透明像素
    if (pixelData.alphas && pixelData.alphas[index] < transparentThreshold) {
      return null;  // 透明像素不放珠子
    }

    // 应用饱和度增强
    let processedRgb = rgb;
    if (saturationBoost > 0) {
      processedRgb = boostVividness(rgb, saturationBoost / 100);
    }

    // 根据设置选择匹配算法
    if (useLabSpace) {
      return findClosestBeadColorLabWithVibrancy(processedRgb, availableColors, vibrancyPreference / 100);
    } else {
      return findClosestBeadColor(processedRgb, availableColors);
    }
  });

  let result: BeadPixelData = {
    width: pixelData.width,
    height: pixelData.height,
    beads,
  };

  // 如果需要限制颜色数量（colorCount 或 maxColors），进行颜色合并
  const targetColorCount = colorCount || options.maxColors;
  if (targetColorCount && targetColorCount > 0) {
    result = reduceColors(result, targetColorCount, availableColors);
  }

  return result;
};

/**
 * 找到最接近的珠子颜色（使用欧氏距离）
 */
export const findClosestBeadColor = (
  rgb: [number, number, number],
  colors: BeadColor[]
): BeadColor => {
  let closest = colors[0];
  let minDistance = Infinity;

  for (const color of colors) {
    const distance = colorDistance(rgb, color.rgb);
    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }

  return closest;
};

// 颜色匹配缓存：避免重复计算相同颜色
const colorMatchCache = new Map<string, BeadColor>();
// 珠子颜色的 Lab 值缓存
const beadLabCache = new Map<string, [number, number, number]>();

/**
 * 获取珠子颜色的 Lab 值（带缓存）
 */
const getBeadLab = (color: BeadColor): [number, number, number] => {
  let lab = beadLabCache.get(color.id);
  if (!lab) {
    lab = rgbToLab(color.rgb);
    beadLabCache.set(color.id, lab);
  }
  return lab;
};

/**
 * 清除颜色匹配缓存（在参数变化时调用）
 */
export const clearColorMatchCache = () => {
  colorMatchCache.clear();
};

/**
 * 使用 Lab 色彩空间找到最接近的颜色（更符合人眼感知）
 * 优化：使用缓存避免重复计算
 */
export const findClosestBeadColorLab = (
  rgb: [number, number, number],
  colors: BeadColor[]
): BeadColor => {
  // 生成缓存 key
  const cacheKey = `${rgb[0]},${rgb[1]},${rgb[2]},${colors.length}`;
  const cached = colorMatchCache.get(cacheKey);
  if (cached) return cached;

  const targetLab = rgbToLab(rgb);
  let closest = colors[0];
  let minDistance = Infinity;

  for (const color of colors) {
    const colorLab = getBeadLab(color); // 使用缓存的 Lab 值
    const distance = labDistance(targetLab, colorLab);
    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }

  // 缓存结果（限制缓存大小）
  if (colorMatchCache.size < 10000) {
    colorMatchCache.set(cacheKey, closest);
  }

  return closest;
};

/**
 * RGB 转 Lab 色彩空间
 */
const rgbToLab = (rgb: [number, number, number]): [number, number, number] => {
  // RGB to XYZ
  let [r, g, b] = rgb.map(v => {
    v = v / 255;
    return v > 0.04045
      ? Math.pow((v + 0.055) / 1.055, 2.4)
      : v / 12.92;
  });

  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750);
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) / 1.08883;

  // XYZ to Lab
  const f = (t: number) => t > 0.008856 ? Math.pow(t, 1/3) : (7.787 * t) + (16 / 116);

  const L = (116 * f(y)) - 16;
  const a = 500 * (f(x) - f(y));
  const bVal = 200 * (f(y) - f(z));

  return [L, a, bVal];
};

/**
 * Lab 色彩空间的距离（Delta E）
 */
const labDistance = (
  lab1: [number, number, number],
  lab2: [number, number, number]
): number => {
  return Math.sqrt(
    Math.pow(lab1[0] - lab2[0], 2) +
    Math.pow(lab1[1] - lab2[1], 2) +
    Math.pow(lab1[2] - lab2[2], 2)
  );
};

/**
 * RGB 转 HSL
 */
const rgbToHsl = (rgb: [number, number, number]): [number, number, number] => {
  const [r, g, b] = rgb.map(v => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l];
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return [h, s, l];
};

/**
 * HSL 转 RGB
 */
const hslToRgb = (hsl: [number, number, number]): [number, number, number] => {
  const [h, s, l] = hsl;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
};

/**
 * 计算颜色的饱和度（0-1）
 */
const getColorSaturation = (rgb: [number, number, number]): number => {
  const [, s] = rgbToHsl(rgb);
  return s;
};

/**
 * 饱和度增强
 * @param rgb 原始 RGB 值
 * @param boost 增强比例（0-1）
 */
const boostSaturation = (
  rgb: [number, number, number],
  boost: number
): [number, number, number] => {
  const [h, s, l] = rgbToHsl(rgb);
  // 增强饱和度，但不超过 1
  const newS = Math.min(1, s + (1 - s) * boost);
  return hslToRgb([h, newS, l]);
};

const boostVividness = (
  rgb: [number, number, number],
  boost: number
): [number, number, number] => {
  const [h, s, l] = rgbToHsl(rgb);
  const nextS = Math.min(1, s + (1 - s) * boost * 0.9);
  const lightnessLift = boost * (l < 0.35 ? 0.12 : l < 0.65 ? 0.08 : 0.04);
  const nextL = Math.min(0.92, l + lightnessLift);
  return hslToRgb([h, nextS, nextL]);
};

/**
 * 使用 Lab 色彩空间找到最接近的颜色，并考虑饱和度匹配
 * @param rgb 目标 RGB 值
 * @param colors 可用颜色列表
 * @param vibrancyWeight 鲜艳度权重（0-1），0 表示纯粹按距离匹配，正值偏好鲜艳，负值偏好柔和
 */
// 带鲜艳度的颜色匹配缓存
const vibrancyMatchCache = new Map<string, BeadColor>();
// 珠子颜色饱和度缓存
const beadSaturationCache = new Map<string, number>();

/**
 * 获取珠子颜色的饱和度（带缓存）
 */
const getBeadSaturation = (color: BeadColor): number => {
  let sat = beadSaturationCache.get(color.id);
  if (sat === undefined) {
    sat = getColorSaturation(color.rgb);
    beadSaturationCache.set(color.id, sat);
  }
  return sat;
};

/**
 * 判断颜色是否为暖色调
 * 暖色：红、橙、黄、棕、米色等
 * 冷色：蓝、绿、紫、青等
 */
const isWarmColor = (rgb: [number, number, number]): boolean => {
  const [r, g, b] = rgb;
  // 暖色判断：红色分量 > 蓝色分量，或者黄色区域（红+绿 > 蓝*2）
  return r > b || (r + g > b * 2);
};

/**
 * 获取颜色的色温值（正值=暖，负值=冷）
 */
const getColorWarmth = (rgb: [number, number, number]): number => {
  const [r, g, b] = rgb;
  // 计算色温：(红-蓝) + (绿-蓝)*0.5
  // 正值表示暖色，负值表示冷色
  return (r - b) / 255 + (g - b) / 510;
};

export const findClosestBeadColorLabWithVibrancy = (
  rgb: [number, number, number],
  colors: BeadColor[],
  vibrancyWeight: number = 0
): BeadColor => {
  // 生成缓存 key（包含鲜艳度权重）- v3: 增加高亮度颜色的亮度优先
  const cacheKey = `v3:${rgb[0]},${rgb[1]},${rgb[2]},${colors.length},${vibrancyWeight.toFixed(2)}`;
  const cached = vibrancyMatchCache.get(cacheKey);
  if (cached) return cached;

  const targetLab = rgbToLab(rgb);
  const targetSaturation = getColorSaturation(rgb);
  const targetWarmth = getColorWarmth(rgb);
  const targetLightness = targetLab[0]; // Lab 的 L 分量表示亮度 (0-100)

  let closest = colors[0];
  let minScore = Infinity;

  for (const color of colors) {
    const colorLab = getBeadLab(color); // 使用缓存的 Lab 值
    const distance = labDistance(targetLab, colorLab);

    // 使用缓存的饱和度值
    const colorSaturation = getBeadSaturation(color);

    // 饱和度差异惩罚：饱和度差异越大，惩罚越大
    // 这样低饱和度颜色会优先匹配低饱和度珠子
    const saturationDiff = Math.abs(targetSaturation - colorSaturation);
    const saturationPenalty = saturationDiff * 40; // 饱和度差异权重

    // 亮度差异惩罚：对高亮度颜色，亮度匹配更重要
    const colorLightness = colorLab[0];
    const lightnessDiff = Math.abs(targetLightness - colorLightness);
    let lightnessPenalty = 0;
    if (targetLightness > 80) {
      // 高亮度颜色（如白皙肤色）：亮度匹配非常重要
      lightnessPenalty = lightnessDiff * 2;
    } else if (targetLightness > 60) {
      // 中高亮度：亮度匹配较重要
      lightnessPenalty = lightnessDiff * 1;
    }

    // 色温匹配惩罚：暖色匹配到冷色会有额外惩罚
    const colorWarmth = getColorWarmth(color.rgb);
    const warmthDiff = targetWarmth - colorWarmth;
    // 如果源色是暖色但匹配到了冷色，给予惩罚
    // warmthDiff > 0 表示源色比目标色更暖
    let warmthPenalty = 0;
    // 对高亮度颜色，减少色温惩罚（亮度更重要）
    const warmthWeight = targetLightness > 80 ? 0.3 : (targetLightness > 60 ? 0.6 : 1.0);
    if (targetWarmth > 0.05 && colorWarmth < -0.05) {
      // 暖色匹配到冷色：强惩罚
      warmthPenalty = Math.abs(warmthDiff) * 60 * warmthWeight;
    } else if (targetWarmth < -0.05 && colorWarmth > 0.05) {
      // 冷色匹配到暖色：轻微惩罚
      warmthPenalty = Math.abs(warmthDiff) * 30 * warmthWeight;
    }

    // 鲜艳度偏好（可选）
    let vibrancyBonus = 0;
    if (vibrancyWeight > 0 && targetSaturation > 0.2) {
      // 正值：偏好鲜艳颜色
      vibrancyBonus = -colorSaturation * vibrancyWeight * 50;
    } else if (vibrancyWeight < 0 && targetSaturation < 0.3) {
      // 负值：偏好柔和颜色（低饱和度颜色匹配时更偏向灰色）
      vibrancyBonus = colorSaturation * Math.abs(vibrancyWeight) * 50;
    }

    const score = distance + saturationPenalty + lightnessPenalty + warmthPenalty + vibrancyBonus;

    if (score < minScore) {
      minScore = score;
      closest = color;
    }
  }

  // 缓存结果（限制缓存大小）
  if (vibrancyMatchCache.size < 10000) {
    vibrancyMatchCache.set(cacheKey, closest);
  }

  return closest;
};

/**
 * 统计珠子使用数量（跳过透明/null 珠子）
 */
export const calculateBeadStatistics = (beadData: BeadPixelData): BeadStatistics[] => {
  const colorCounts = new Map<string, { color: BeadColor; count: number }>();
  let validBeadCount = 0;  // 非透明珠子总数

  for (const bead of beadData.beads) {
    if (bead === null) continue;  // 跳过透明珠子
    validBeadCount++;

    const existing = colorCounts.get(bead.id);
    if (existing) {
      existing.count++;
    } else {
      colorCounts.set(bead.id, { color: bead, count: 1 });
    }
  }

  const statistics: BeadStatistics[] = Array.from(colorCounts.values())
    .map(({ color, count }) => ({
      color,
      count,
      percentage: validBeadCount > 0 ? (count / validBeadCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return statistics;
};

/**
 * 智能合并结果
 */
export interface SmartMergeResult {
  /** 合并后的 beadData */
  mergedData: BeadPixelData;
  /** 合并报告：被合并的颜色 -> 合并目标 */
  mergeReport: Array<{
    fromColor: BeadColor;
    toColor: BeadColor;
    count: number;
  }>;
  /** 合并前颜色数 */
  beforeCount: number;
  /** 合并后颜色数 */
  afterCount: number;
}

/**
 * 智能合并颜色 - 将使用量低于阈值的颜色合并到最相近的颜色
 * @param beadData 珠子数据
 * @param threshold 阈值（使用数量 <= threshold 的颜色将被合并）
 */
export const smartMergeColors = (
  beadData: BeadPixelData,
  threshold: number
): SmartMergeResult => {
  const stats = calculateBeadStatistics(beadData);
  const beforeCount = stats.length;

  // 分为保留颜色和待合并颜色
  const keepColors: BeadColor[] = [];
  const mergeColors: { color: BeadColor; count: number }[] = [];

  for (const stat of stats) {
    if (stat.count <= threshold) {
      mergeColors.push({ color: stat.color, count: stat.count });
    } else {
      keepColors.push(stat.color);
    }
  }

  if (mergeColors.length === 0 || keepColors.length === 0) {
    return {
      mergedData: beadData,
      mergeReport: [],
      beforeCount,
      afterCount: beforeCount,
    };
  }

  // 每个待合并颜色找最近的保留颜色
  const mergeReport: SmartMergeResult['mergeReport'] = [];
  const colorMapping = new Map<string, BeadColor>();

  for (const { color: fromColor, count } of mergeColors) {
    const toColor = findClosestBeadColor(fromColor.rgb, keepColors);
    colorMapping.set(fromColor.id, toColor);
    mergeReport.push({ fromColor, toColor, count });
  }

  // 应用合并
  const newBeads = beadData.beads.map(bead => {
    if (bead === null) return null;
    return colorMapping.get(bead.id) || bead;
  });

  const mergedData: BeadPixelData = { ...beadData, beads: newBeads };
  const afterStats = calculateBeadStatistics(mergedData);

  return {
    mergedData,
    mergeReport,
    beforeCount,
    afterCount: afterStats.length,
  };
};

/**
 * 减少颜色数量（合并相似颜色）
 */
export const reduceColors = (
  beadData: BeadPixelData,
  maxColors: number,
  availableColors: BeadColor[]
): BeadPixelData => {
  // 统计当前使用的颜色
  const stats = calculateBeadStatistics(beadData);

  if (stats.length <= maxColors) {
    return beadData;
  }

  // 保留使用最多的颜色
  const keepColors = stats.slice(0, maxColors).map(s => s.color);
  const removeColors = stats.slice(maxColors).map(s => s.color);

  // 将被移除的颜色映射到最接近的保留颜色
  const colorMapping = new Map<string, BeadColor>();
  for (const removeColor of removeColors) {
    const closest = findClosestBeadColor(removeColor.rgb, keepColors);
    colorMapping.set(removeColor.id, closest);
  }

  // 应用颜色映射（保留透明珠子）
  const newBeads = beadData.beads.map(bead => {
    if (bead === null) return null;  // 保持透明
    const mapped = colorMapping.get(bead.id);
    return mapped || bead;
  });

  return {
    ...beadData,
    beads: newBeads,
  };
};

/**
 * 替换指定颜色
 */
export const replaceColor = (
  beadData: BeadPixelData,
  oldColorId: string,
  newColor: BeadColor
): BeadPixelData => {
  const newBeads = beadData.beads.map(bead =>
    bead.id === oldColorId ? newColor : bead
  );

  return {
    ...beadData,
    beads: newBeads,
  };
};

/**
 * 排除指定颜色（将其替换为最接近的其他颜色）
 */
export const excludeColor = (
  beadData: BeadPixelData,
  excludeColorId: string,
  brand: 'perler' | 'hama' | 'artkal'
): BeadPixelData => {
  const availableColors = getColorsByBrand(brand).filter(c => c.id !== excludeColorId);
  const excludedColor = beadData.beads.find(b => b.id === excludeColorId);

  if (!excludedColor) {
    return beadData;
  }

  const replacement = findClosestBeadColor(excludedColor.rgb, availableColors);

  return replaceColor(beadData, excludeColorId, replacement);
};

/**
 * 找下一个相近颜色（排除当前色和已尝试过的颜色）
 * 用于颜色替换功能
 */
export const findNextSimilarColor = (
  currentColorId: string,
  excludeIds: string[] = []
): BeadColor | null => {
  const current = allBeadColors.find(c => c.id === currentColorId);
  if (!current) return null;

  // 排除当前颜色和已尝试过的颜色
  const available = allBeadColors.filter(
    c => c.id !== currentColorId && !excludeIds.includes(c.id)
  );

  if (available.length === 0) return null;

  return findClosestBeadColor(current.rgb, available);
};

/**
 * 获取某个位置的珠子颜色
 */
export const getBeadAt = (
  beadData: BeadPixelData,
  x: number,
  y: number
): BeadColor | null => {
  const { width, height, beads } = beadData;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    return null;
  }

  const index = y * width + x;
  return beads[index];
};

/**
 * 设置某个位置的珠子颜色
 */
export const setBeadAt = (
  beadData: BeadPixelData,
  x: number,
  y: number,
  color: BeadColor
): void => {
  const { width, height, beads } = beadData;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  const index = y * width + x;
  beads[index] = color;
};

/**
 * 将珠子数据渲染到 Canvas
 * @param beadData 珠子数据
 * @param canvas Canvas元素
 * @param cellSize 单元格大小
 * @param showGrid 是否显示基础网格线
 * @param showColorCode 是否显示颜色代码
 * @param showMajorGrid 是否显示大网格线（5×5中等线 + 10×10粗线）
 */
export const renderBeadsToCanvas = (
  beadData: BeadPixelData,
  canvas: HTMLCanvasElement,
  cellSize: number = 20,
  showGrid: boolean = true,
  showColorCode: boolean = false,
  showMajorGrid: boolean = false
): void => {
  const { width, height, beads } = beadData;
  const canvasWidth = width * cellSize;
  const canvasHeight = height * cellSize;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 绘制每个珠子
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const bead = beads[index];

      const px = x * cellSize;
      const py = y * cellSize;

      // 透明珠子：绘制棋盘格背景表示无珠子
      if (bead === null) {
        const checkSize = cellSize / 2;
        for (let cy = 0; cy < 2; cy++) {
          for (let cx = 0; cx < 2; cx++) {
            ctx.fillStyle = (cx + cy) % 2 === 0 ? '#e0e0e0' : '#c0c0c0';
            ctx.fillRect(px + cx * checkSize, py + cy * checkSize, checkSize, checkSize);
          }
        }
        continue;  // 跳过后续珠子绘制
      }

      // 绘制色块（纯色方块，不再绘制圆形高光）
      ctx.fillStyle = bead.hex;
      ctx.fillRect(px, py, cellSize, cellSize);

    }
  }

  // 显示颜色代码（横排计数方式）
  if (showColorCode && cellSize >= 15) {
    const fontSize = Math.max(10, Math.round(cellSize * 0.35));
    ctx.font = `500 ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < height; y++) {
      let currentColorId = '';  // 当前段的原始色号
      let segmentCount = 0;     // 当前段计数

      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const bead = beads[index];

        // 跳过透明珠子
        if (bead === null) {
          currentColorId = '';  // 重置计数
          segmentCount = 0;
          continue;
        }

        const px = x * cellSize;
        const py = y * cellSize;

        // 计算背景亮度：默认深色字体，只有很暗的背景才用白色
        const r = parseInt(bead.rgb.slice(1, 3), 16);
        const g = parseInt(bead.rgb.slice(3, 5), 16);
        const b = parseInt(bead.rgb.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const isDark = luminance < 0.35; // 只有很暗的颜色才用白字
        ctx.fillStyle = isDark ? '#ffffff' : '#1a1a1a';
        ctx.strokeStyle = isDark ? '#000000' : '#ffffff';
        ctx.lineWidth = fontSize > 12 ? 1.5 : 0.8;

        // Perler 色号转换：80-19001 → P01, 80-15265 → P265
        let displayColorId = bead.id;
        if (bead.id.startsWith('80-19') || bead.id.startsWith('80-15')) {
          const numPart = bead.id.slice(5);
          displayColorId = 'P' + parseInt(numPart, 10).toString();
        }

        // 按横排计数显示：段首显示色号，后续显示序号
        let displayText = '';
        if (bead.id !== currentColorId || segmentCount >= 99) {
          // 新颜色段开始 或 超过99个，显示色号
          currentColorId = bead.id;
          segmentCount = 1;
          displayText = displayColorId;
        } else {
          // 同色续段，显示序号
          segmentCount++;
          displayText = segmentCount.toString();
        }

        // 添加文字描边以增强可读性
        ctx.strokeText(displayText, px + cellSize / 2, py + cellSize / 2);
        ctx.fillText(displayText, px + cellSize / 2, py + cellSize / 2);
      }
    }
  }

  // 绘制网格线
  if (showGrid) {
    // 基础细网格线（每1格）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvasHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvasWidth, y * cellSize);
      ctx.stroke();
    }

    // 大网格线（5×5中等线 + 10×10粗线）
    if (showMajorGrid) {
      // 5×5 中等网格线（蓝色，较细）
      ctx.strokeStyle = 'rgba(0, 100, 200, 0.5)';
      ctx.lineWidth = Math.max(1, Math.round(cellSize / 10));

      for (let x = 0; x <= width; x++) {
        if (x % 5 === 0 && x % 10 !== 0) {
          ctx.beginPath();
          ctx.moveTo(x * cellSize, 0);
          ctx.lineTo(x * cellSize, canvasHeight);
          ctx.stroke();
        }
      }

      for (let y = 0; y <= height; y++) {
        if (y % 5 === 0 && y % 10 !== 0) {
          ctx.beginPath();
          ctx.moveTo(0, y * cellSize);
          ctx.lineTo(canvasWidth, y * cellSize);
          ctx.stroke();
        }
      }

      // 10×10 粗网格线（黑色，最粗）
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = Math.max(2, Math.round(cellSize / 6));

      for (let x = 0; x <= width; x++) {
        if (x % 10 === 0) {
          ctx.beginPath();
          ctx.moveTo(x * cellSize, 0);
          ctx.lineTo(x * cellSize, canvasHeight);
          ctx.stroke();
        }
      }

      for (let y = 0; y <= height; y++) {
        if (y % 10 === 0) {
          ctx.beginPath();
          ctx.moveTo(0, y * cellSize);
          ctx.lineTo(canvasWidth, y * cellSize);
          ctx.stroke();
        }
      }
    }
  }
};

/**
 * 获取对比色（用于文字显示）
 */
const getContrastColor = (rgb: [number, number, number]): string => {
  const [r, g, b] = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

/**
 * 导出珠子图案为图片
 * @param beadData 珠子数据
 * @param cellSize 单元格大小
 * @param showGrid 是否显示基础网格线
 * @param showColorCode 是否显示颜色代码
 * @param format 导出格式
 * @param showMajorGrid 是否显示大网格线（5×5中等线 + 10×10粗线）
 */
export const exportBeadPattern = (
  beadData: BeadPixelData,
  cellSize: number = 20,
  showGrid: boolean = true,
  showColorCode: boolean = false,
  format: 'png' | 'jpeg' = 'png',
  showMajorGrid: boolean = false
): string => {
  const canvas = document.createElement('canvas');
  renderBeadsToCanvas(beadData, canvas, cellSize, showGrid, showColorCode, showMajorGrid);
  return canvas.toDataURL(`image/${format}`);
};

/**
 * 将珠子数据渲染到 Canvas（带珠子清单）
 * @param beadData 珠子数据
 * @param canvas Canvas元素
 * @param cellSize 单元格大小
 * @param showGrid 是否显示基础网格线
 * @param showColorCode 是否显示颜色代码
 * @param showMajorGrid 是否显示大网格线
 * @param showBeadList 是否显示珠子清单
 */
export const renderBeadsToCanvasWithList = (
  beadData: BeadPixelData,
  canvas: HTMLCanvasElement,
  cellSize: number = 20,
  showGrid: boolean = true,
  showColorCode: boolean = false,
  showMajorGrid: boolean = false,
  showBeadList: boolean = true
): void => {
  const { width, height } = beadData;
  const patternWidth = width * cellSize;
  const patternHeight = height * cellSize;

  // 计算珠子清单需要的宽度
  const stats = calculateBeadStatistics(beadData);
  const listPadding = Math.max(16, Math.round(cellSize * 0.8));
  const rowHeight = Math.max(24, Math.round(cellSize * 1.2));
  const colorBlockSize = Math.max(16, Math.round(cellSize * 0.8));
  const titleFontSize = Math.max(16, Math.round(cellSize * 0.8));
  const textFontSize = Math.max(12, Math.round(cellSize * 0.6));

  // 清单宽度：根据内容动态计算
  const listWidth = showBeadList ? Math.max(200, Math.round(cellSize * 10)) : 0;

  // 计算清单需要的高度
  const headerHeight = listPadding * 2 + titleFontSize + rowHeight * 3; // 标题 + 3行基本信息
  const listContentHeight = stats.length * rowHeight + listPadding * 2;
  const totalListHeight = headerHeight + listContentHeight;

  // Canvas 尺寸
  const canvasWidth = patternWidth + listWidth;
  const canvasHeight = Math.max(patternHeight, totalListHeight);

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 填充背景色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ========== 绘制图案部分 ==========
  const { beads } = beadData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const bead = beads[index];

      const px = x * cellSize;
      const py = y * cellSize;

      // 透明珠子：绘制棋盘格背景表示无珠子
      if (bead === null) {
        const checkSize = cellSize / 2;
        for (let cy = 0; cy < 2; cy++) {
          for (let cx = 0; cx < 2; cx++) {
            ctx.fillStyle = (cx + cy) % 2 === 0 ? '#e0e0e0' : '#c0c0c0';
            ctx.fillRect(px + cx * checkSize, py + cy * checkSize, checkSize, checkSize);
          }
        }
        continue;
      }

      // 绘制色块
      ctx.fillStyle = bead.hex;
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }

  // 显示颜色代码
  if (showColorCode && cellSize >= 15) {
    const fontSize = Math.max(10, Math.round(cellSize * 0.35));
    ctx.font = `500 ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < height; y++) {
      let currentColorId = '';
      let segmentCount = 0;

      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const bead = beads[index];

        if (bead === null) {
          currentColorId = '';
          segmentCount = 0;
          continue;
        }

        const px = x * cellSize;
        const py = y * cellSize;

        // 计算背景亮度：默认深色字体，只有很暗的背景才用白色
        const r = parseInt(bead.rgb.slice(1, 3), 16);
        const g = parseInt(bead.rgb.slice(3, 5), 16);
        const b = parseInt(bead.rgb.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const isDark = luminance < 0.35;
        ctx.fillStyle = isDark ? '#ffffff' : '#1a1a1a';
        ctx.strokeStyle = isDark ? '#000000' : '#ffffff';
        ctx.lineWidth = fontSize > 12 ? 1.5 : 0.8;

        let displayColorId = bead.id;
        if (bead.id.startsWith('80-19') || bead.id.startsWith('80-15')) {
          const numPart = bead.id.slice(5);
          displayColorId = 'P' + parseInt(numPart, 10).toString();
        }

        let displayText = '';
        if (bead.id !== currentColorId || segmentCount >= 99) {
          currentColorId = bead.id;
          segmentCount = 1;
          displayText = displayColorId;
        } else {
          segmentCount++;
          displayText = segmentCount.toString();
        }

        ctx.strokeText(displayText, px + cellSize / 2, py + cellSize / 2);
        ctx.fillText(displayText, px + cellSize / 2, py + cellSize / 2);
      }
    }
  }

  // 绘制网格线
  if (showGrid) {
    // 基础细网格线
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, patternHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(patternWidth, y * cellSize);
      ctx.stroke();
    }

    // 大网格线
    if (showMajorGrid) {
      // 5×5 中等网格线
      ctx.strokeStyle = 'rgba(0, 100, 200, 0.5)';
      ctx.lineWidth = Math.max(1, Math.round(cellSize / 10));

      for (let x = 0; x <= width; x++) {
        if (x % 5 === 0 && x % 10 !== 0) {
          ctx.beginPath();
          ctx.moveTo(x * cellSize, 0);
          ctx.lineTo(x * cellSize, patternHeight);
          ctx.stroke();
        }
      }

      for (let y = 0; y <= height; y++) {
        if (y % 5 === 0 && y % 10 !== 0) {
          ctx.beginPath();
          ctx.moveTo(0, y * cellSize);
          ctx.lineTo(patternWidth, y * cellSize);
          ctx.stroke();
        }
      }

      // 10×10 粗网格线
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = Math.max(2, Math.round(cellSize / 6));

      for (let x = 0; x <= width; x++) {
        if (x % 10 === 0) {
          ctx.beginPath();
          ctx.moveTo(x * cellSize, 0);
          ctx.lineTo(x * cellSize, patternHeight);
          ctx.stroke();
        }
      }

      for (let y = 0; y <= height; y++) {
        if (y % 10 === 0) {
          ctx.beginPath();
          ctx.moveTo(0, y * cellSize);
          ctx.lineTo(patternWidth, y * cellSize);
          ctx.stroke();
        }
      }
    }
  }

  // ========== 绘制珠子清单 ==========
  if (showBeadList && listWidth > 0) {
    const listX = patternWidth;
    let currentY = listPadding;

    // 绘制分隔线
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(listX, 0);
    ctx.lineTo(listX, canvasHeight);
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${titleFontSize}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('珠子清单', listX + listPadding, currentY);
    currentY += titleFontSize + listPadding;

    // 基本信息
    ctx.font = `${textFontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#666666';

    const validBeadCount = beads.filter(b => b !== null).length;

    ctx.fillText(`尺寸: ${width} × ${height}`, listX + listPadding, currentY);
    currentY += rowHeight * 0.8;

    ctx.fillText(`珠子: ${validBeadCount} 颗`, listX + listPadding, currentY);
    currentY += rowHeight * 0.8;

    ctx.fillText(`颜色: ${stats.length} 种`, listX + listPadding, currentY);
    currentY += rowHeight * 1.2;

    // 分隔线
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(listX + listPadding, currentY);
    ctx.lineTo(listX + listWidth - listPadding, currentY);
    ctx.stroke();
    currentY += listPadding;

    // 颜色列表
    for (const stat of stats) {
      // 检查是否超出画布高度
      if (currentY + rowHeight > canvasHeight - listPadding) {
        ctx.fillStyle = '#999999';
        ctx.font = `${textFontSize}px Arial, sans-serif`;
        ctx.fillText('...更多颜色', listX + listPadding, currentY);
        break;
      }

      // 色块
      ctx.fillStyle = stat.color.hex;
      ctx.fillRect(listX + listPadding, currentY, colorBlockSize, colorBlockSize);

      // 色块边框
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(listX + listPadding, currentY, colorBlockSize, colorBlockSize);

      // 颜色名称和数量
      ctx.fillStyle = '#333333';
      ctx.font = `${textFontSize}px Arial, sans-serif`;
      ctx.textBaseline = 'middle';

      // 颜色名（中文名优先，超长则截断）
      const colorName = stat.color.nameCN || stat.color.name;
      const maxNameWidth = listWidth - listPadding * 2 - colorBlockSize - 60;
      let displayName = colorName;

      // 测量并截断
      while (ctx.measureText(displayName).width > maxNameWidth && displayName.length > 1) {
        displayName = displayName.slice(0, -1);
      }
      if (displayName !== colorName) {
        displayName += '..';
      }

      ctx.fillText(
        displayName,
        listX + listPadding + colorBlockSize + 8,
        currentY + colorBlockSize / 2
      );

      // 数量（右对齐）
      ctx.textAlign = 'right';
      ctx.fillText(
        `${stat.count}`,
        listX + listWidth - listPadding,
        currentY + colorBlockSize / 2
      );
      ctx.textAlign = 'left';

      currentY += rowHeight;
    }
  }
};

/**
 * 生成珠子清单文本
 */
export const generateBeadList = (beadData: BeadPixelData): string => {
  const stats = calculateBeadStatistics(beadData);
  const totalBeads = beadData.beads.length;

  let text = '=== 珠子清单 ===\n\n';
  text += `图案尺寸: ${beadData.width} x ${beadData.height}\n`;
  text += `珠子总数: ${totalBeads} 颗\n`;
  text += `使用颜色: ${stats.length} 种\n\n`;
  text += '--- 颜色明细 ---\n\n';

  stats.forEach((stat, index) => {
    text += `${index + 1}. ${stat.color.id} ${stat.color.nameCN}(${stat.color.name}): ${stat.count} 颗 (${stat.percentage.toFixed(1)}%)\n`;
  });

  return text;
};

/**
 * 按拼豆板分页渲染
 * @param beadData 完整图案数据
 * @param cellSize 每格像素大小
 * @param boardSize 拼豆板尺寸（如 29x29）
 * @param options 渲染选项
 * @returns 每页的 canvas 数组
 */
export interface PaginatedPage {
  canvas: HTMLCanvasElement;
  pageIndex: number;
  totalPages: number;
  rowIndex: number;
  colIndex: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const renderBeadsPaginated = (
  beadData: BeadPixelData,
  cellSize: number,
  boardSize: number,
  options: {
    showGrid?: boolean;
    showCoords?: boolean;
    showMajorGrid?: boolean;
  } = {}
): PaginatedPage[] => {
  const { width, height } = beadData;
  const { showGrid = true, showCoords = true, showMajorGrid = true } = options;

  const cols = Math.ceil(width / boardSize);
  const rows = Math.ceil(height / boardSize);
  const totalPages = rows * cols;
  const pages: PaginatedPage[] = [];

  const headerHeight = cellSize * 2; // 页码标注高度

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const startX = col * boardSize;
      const startY = row * boardSize;
      const endX = Math.min(startX + boardSize, width);
      const endY = Math.min(startY + boardSize, height);
      const pageW = endX - startX;
      const pageH = endY - startY;

      const canvas = document.createElement('canvas');
      const canvasW = pageW * cellSize;
      const canvasH = pageH * cellSize + headerHeight;
      canvas.width = canvasW;
      canvas.height = canvasH;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      // 白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      // 页码标注
      const pageNum = row * cols + col + 1;
      ctx.fillStyle = '#333333';
      ctx.font = `bold ${Math.max(14, cellSize * 0.6)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `第 ${pageNum}/${totalPages} 页  行${row + 1} 列${col + 1}  [${startX + 1}-${endX}, ${startY + 1}-${endY}]`,
        canvasW / 2,
        headerHeight / 2
      );

      // 渲染珠子
      const offsetY = headerHeight;
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const bead = beadData.beads[y * width + x];
          const px = (x - startX) * cellSize;
          const py = (y - startY) * cellSize + offsetY;

          if (bead) {
            ctx.fillStyle = bead.hex;
            ctx.fillRect(px, py, cellSize, cellSize);
          } else {
            // 透明格子用浅灰棋盘格
            ctx.fillStyle = (x + y) % 2 === 0 ? '#f0f0f0' : '#e0e0e0';
            ctx.fillRect(px, py, cellSize, cellSize);
          }
        }
      }

      // 网格线
      if (showGrid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= pageW; x++) {
          ctx.beginPath();
          ctx.moveTo(x * cellSize, offsetY);
          ctx.lineTo(x * cellSize, offsetY + pageH * cellSize);
          ctx.stroke();
        }
        for (let y = 0; y <= pageH; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y * cellSize + offsetY);
          ctx.lineTo(pageW * cellSize, y * cellSize + offsetY);
          ctx.stroke();
        }
      }

      // 大网格线
      if (showMajorGrid) {
        // 5x5 蓝线
        ctx.strokeStyle = 'rgba(100,150,255,0.4)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= pageW; x++) {
          if ((startX + x) % 5 === 0) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, offsetY);
            ctx.lineTo(x * cellSize, offsetY + pageH * cellSize);
            ctx.stroke();
          }
        }
        for (let y = 0; y <= pageH; y++) {
          if ((startY + y) % 5 === 0) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize + offsetY);
            ctx.lineTo(pageW * cellSize, y * cellSize + offsetY);
            ctx.stroke();
          }
        }

        // 10x10 黑线
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        for (let x = 0; x <= pageW; x++) {
          if ((startX + x) % 10 === 0) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, offsetY);
            ctx.lineTo(x * cellSize, offsetY + pageH * cellSize);
            ctx.stroke();
          }
        }
        for (let y = 0; y <= pageH; y++) {
          if ((startY + y) % 10 === 0) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize + offsetY);
            ctx.lineTo(pageW * cellSize, y * cellSize + offsetY);
            ctx.stroke();
          }
        }
      }

      // 坐标刻度
      if (showCoords) {
        ctx.fillStyle = '#666';
        ctx.font = `${Math.max(8, cellSize * 0.3)}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // X 轴
        for (let x = 0; x < pageW; x += 5) {
          ctx.fillText(`${startX + x + 1}`, x * cellSize + cellSize / 2, offsetY + pageH * cellSize + 2);
        }
        // Y 轴
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let y = 0; y < pageH; y += 5) {
          ctx.fillText(`${startY + y + 1}`, -2, y * cellSize + cellSize / 2 + offsetY);
        }
      }

      pages.push({
        canvas,
        pageIndex: pageNum - 1,
        totalPages,
        rowIndex: row,
        colIndex: col,
        startX,
        startY,
        endX,
        endY,
      });
    }
  }

  return pages;
};

export default {
  matchPixelsToBead,
  findClosestBeadColor,
  findClosestBeadColorLab,
  calculateBeadStatistics,
  smartMergeColors,
  reduceColors,
  replaceColor,
  excludeColor,
  findNextSimilarColor,
  getBeadAt,
  setBeadAt,
  renderBeadsToCanvas,
  renderBeadsPaginated,
  exportBeadPattern,
  generateBeadList,
};
