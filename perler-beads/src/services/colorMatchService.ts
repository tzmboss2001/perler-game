/**
 * 棰滆壊鍖归厤鏈嶅姟
 * 灏嗗儚绱犻鑹插尮閰嶅埌鏈€鎺ヨ繎鐨勭彔瀛愰鑹?
 */

import {
  BeadColor,
  getColorsByBrand,
  colorDistance,
  allBeadColors,
} from '../data/beadColors';
import { getPhysicalBoardDrawSize, getPhysicalBoardGuideOffsets } from './boardService';
import { PixelData } from './pixelizeService';

export interface BeadPixelData {
  width: number;
  height: number;
  beads: (BeadColor | null)[];  // 姣忎釜鍍忕礌瀵瑰簲鐨勭彔瀛愰鑹诧紝null 琛ㄧず閫忔槑锛堟棤鐝犲瓙锛?
}

export interface BeadStatistics {
  color: BeadColor;
  count: number;
  percentage: number;
}

interface ExportCoordinateOptions {
  showCoords?: boolean;
  boardSize?: number;
  pixelRatio?: number;
}

interface ExportCoordGutters {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ColorMatchOptions {
  brand?: 'perler' | 'hama' | 'artkal';  // 鍙€夛紝鍚戝悗鍏煎
  colorCount?: number;                    // 鏂板锛氶鑹叉暟閲忥紙浣跨敤缁熶竴鑹插簱锛?
  excludeColors?: string[];               // 瑕佹帓闄ょ殑棰滆壊ID
  maxColors?: number;                     // 鏈€澶ч鑹叉暟閲忥紙鍚堝苟鐩镐技棰滆壊锛?
  saturationBoost?: number;               // 楗卞拰搴﹀寮?0-100锛岄粯璁?0
  useLabSpace?: boolean;                  // 浣跨敤 Lab 鑹插僵绌洪棿鍖归厤锛岄粯璁?true
  vibrancyPreference?: number;            // 椴滆壋搴﹀亸濂?0-100锛岄粯璁?30
  transparentThreshold?: number;          // 閫忔槑搴﹂槇鍊?0-255锛屼綆浜庢鍊艰涓洪€忔槑锛岄粯璁?128
}

/**
 * 灏嗗儚绱犳暟鎹尮閰嶅埌鐝犲瓙棰滆壊
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
    transparentThreshold = 128,  // 榛樿闃堝€硷細alpha < 128 瑙嗕负閫忔槑
  } = options;

  // 鑾峰彇鍙敤棰滆壊锛氬鏋滄寚瀹氫簡 colorCount锛屼娇鐢ㄧ粺涓€鑹插簱锛涘惁鍒欎娇鐢ㄥ搧鐗岃壊搴?
  let availableColors = colorCount
    ? allBeadColors
    : getColorsByBrand(brand || 'artkal');

  // 鎺掗櫎鎸囧畾棰滆壊
  if (excludeColors.length > 0) {
    availableColors = availableColors.filter(c => !excludeColors.includes(c.id));
  }

  // 鍖归厤姣忎釜鍍忕礌
  const beads: (BeadColor | null)[] = pixelData.pixels.map((rgb, index) => {
    // 妫€鏌ユ槸鍚︿负閫忔槑鍍忕礌
    if (pixelData.alphas && pixelData.alphas[index] < transparentThreshold) {
      return null;  // 閫忔槑鍍忕礌涓嶆斁鐝犲瓙
    }

    // 搴旂敤楗卞拰搴﹀寮?
    let processedRgb = rgb;
    if (saturationBoost > 0) {
      processedRgb = boostVividness(rgb, saturationBoost / 100);
    }

    // 鏍规嵁璁剧疆閫夋嫨鍖归厤绠楁硶
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

  // 濡傛灉闇€瑕侀檺鍒堕鑹叉暟閲忥紙colorCount 鎴?maxColors锛夛紝杩涜棰滆壊鍚堝苟
  const targetColorCount = colorCount || options.maxColors;
  if (targetColorCount && targetColorCount > 0) {
    result = reduceColors(result, targetColorCount, availableColors);
  }

  return result;
};

/**
 * 鎵惧埌鏈€鎺ヨ繎鐨勭彔瀛愰鑹诧紙浣跨敤娆ф皬璺濈锛?
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

// 棰滆壊鍖归厤缂撳瓨锛氶伩鍏嶉噸澶嶈绠楃浉鍚岄鑹?
const colorMatchCache = new Map<string, BeadColor>();
// 鐝犲瓙棰滆壊鐨?Lab 鍊肩紦瀛?
const beadLabCache = new Map<string, [number, number, number]>();

/**
 * 鑾峰彇鐝犲瓙棰滆壊鐨?Lab 鍊硷紙甯︾紦瀛橈級
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
 * 娓呴櫎棰滆壊鍖归厤缂撳瓨锛堝湪鍙傛暟鍙樺寲鏃惰皟鐢級
 */
export const clearColorMatchCache = () => {
  colorMatchCache.clear();
};

/**
 * 浣跨敤 Lab 鑹插僵绌洪棿鎵惧埌鏈€鎺ヨ繎鐨勯鑹诧紙鏇寸鍚堜汉鐪兼劅鐭ワ級
 * 浼樺寲锛氫娇鐢ㄧ紦瀛橀伩鍏嶉噸澶嶈绠?
 */
export const findClosestBeadColorLab = (
  rgb: [number, number, number],
  colors: BeadColor[]
): BeadColor => {
  // 鐢熸垚缂撳瓨 key
  const cacheKey = `${rgb[0]},${rgb[1]},${rgb[2]},${colors.length}`;
  const cached = colorMatchCache.get(cacheKey);
  if (cached) return cached;

  const targetLab = rgbToLab(rgb);
  let closest = colors[0];
  let minDistance = Infinity;

  for (const color of colors) {
    const colorLab = getBeadLab(color); // 浣跨敤缂撳瓨鐨?Lab 鍊?
    const distance = labDistance(targetLab, colorLab);
    if (distance < minDistance) {
      minDistance = distance;
      closest = color;
    }
  }

  // 缂撳瓨缁撴灉锛堥檺鍒剁紦瀛樺ぇ灏忥級
  if (colorMatchCache.size < 10000) {
    colorMatchCache.set(cacheKey, closest);
  }

  return closest;
};

/**
 * RGB 杞?Lab 鑹插僵绌洪棿
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
 * Lab 鑹插僵绌洪棿鐨勮窛绂伙紙Delta E锛?
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
 * RGB 杞?HSL
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
 * HSL 杞?RGB
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
 * 璁＄畻棰滆壊鐨勯ケ鍜屽害锛?-1锛?
 */
const getColorSaturation = (rgb: [number, number, number]): number => {
  const [, s] = rgbToHsl(rgb);
  return s;
};

/**
 * 楗卞拰搴﹀寮?
 * @param rgb 鍘熷 RGB 鍊?
 * @param boost 澧炲己姣斾緥锛?-1锛?
 */
const boostSaturation = (
  rgb: [number, number, number],
  boost: number
): [number, number, number] => {
  const [h, s, l] = rgbToHsl(rgb);
  // 澧炲己楗卞拰搴︼紝浣嗕笉瓒呰繃 1
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
 * 浣跨敤 Lab 鑹插僵绌洪棿鎵惧埌鏈€鎺ヨ繎鐨勯鑹诧紝骞惰€冭檻楗卞拰搴﹀尮閰?
 * @param rgb 鐩爣 RGB 鍊?
 * @param colors 鍙敤棰滆壊鍒楄〃
 * @param vibrancyWeight 椴滆壋搴︽潈閲嶏紙0-1锛夛紝0 琛ㄧず绾补鎸夎窛绂诲尮閰嶏紝姝ｅ€煎亸濂介矞鑹筹紝璐熷€煎亸濂芥煍鍜?
 */
// 甯﹂矞鑹冲害鐨勯鑹插尮閰嶇紦瀛?
const vibrancyMatchCache = new Map<string, BeadColor>();
// 鐝犲瓙棰滆壊楗卞拰搴︾紦瀛?
const beadSaturationCache = new Map<string, number>();

/**
 * 鑾峰彇鐝犲瓙棰滆壊鐨勯ケ鍜屽害锛堝甫缂撳瓨锛?
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
 * 鍒ゆ柇棰滆壊鏄惁涓烘殩鑹茶皟
 * 鏆栬壊锛氱孩銆佹銆侀粍銆佹銆佺背鑹茬瓑
 * 鍐疯壊锛氳摑銆佺豢銆佺传銆侀潚绛?
 */
const isWarmColor = (rgb: [number, number, number]): boolean => {
  const [r, g, b] = rgb;
  // 鏆栬壊鍒ゆ柇锛氱孩鑹插垎閲?> 钃濊壊鍒嗛噺锛屾垨鑰呴粍鑹插尯鍩燂紙绾?缁?> 钃?2锛?
  return r > b || (r + g > b * 2);
};

/**
 * 鑾峰彇棰滆壊鐨勮壊娓╁€硷紙姝ｅ€?鏆栵紝璐熷€?鍐凤級
 */
const getColorWarmth = (rgb: [number, number, number]): number => {
  const [r, g, b] = rgb;
  // 璁＄畻鑹叉俯锛?绾?钃? + (缁?钃?*0.5
  // 姝ｅ€艰〃绀烘殩鑹诧紝璐熷€艰〃绀哄喎鑹?
  return (r - b) / 255 + (g - b) / 510;
};

export const findClosestBeadColorLabWithVibrancy = (
  rgb: [number, number, number],
  colors: BeadColor[],
  vibrancyWeight: number = 0
): BeadColor => {
  // 鐢熸垚缂撳瓨 key锛堝寘鍚矞鑹冲害鏉冮噸锛? v3: 澧炲姞楂樹寒搴﹂鑹茬殑浜害浼樺厛
  const cacheKey = `v3:${rgb[0]},${rgb[1]},${rgb[2]},${colors.length},${vibrancyWeight.toFixed(2)}`;
  const cached = vibrancyMatchCache.get(cacheKey);
  if (cached) return cached;

  const targetLab = rgbToLab(rgb);
  const targetSaturation = getColorSaturation(rgb);
  const targetWarmth = getColorWarmth(rgb);
  const targetLightness = targetLab[0]; // Lab 鐨?L 鍒嗛噺琛ㄧず浜害 (0-100)

  let closest = colors[0];
  let minScore = Infinity;

  for (const color of colors) {
    const colorLab = getBeadLab(color); // 浣跨敤缂撳瓨鐨?Lab 鍊?
    const distance = labDistance(targetLab, colorLab);

    // 浣跨敤缂撳瓨鐨勯ケ鍜屽害鍊?
    const colorSaturation = getBeadSaturation(color);

    // 楗卞拰搴﹀樊寮傛儵缃氾細楗卞拰搴﹀樊寮傝秺澶э紝鎯╃綒瓒婂ぇ
    // 杩欐牱浣庨ケ鍜屽害棰滆壊浼氫紭鍏堝尮閰嶄綆楗卞拰搴︾彔瀛?
    const saturationDiff = Math.abs(targetSaturation - colorSaturation);
    const saturationPenalty = saturationDiff * 40; // 楗卞拰搴﹀樊寮傛潈閲?

    // 浜害宸紓鎯╃綒锛氬楂樹寒搴﹂鑹诧紝浜害鍖归厤鏇撮噸瑕?
    const colorLightness = colorLab[0];
    const lightnessDiff = Math.abs(targetLightness - colorLightness);
    let lightnessPenalty = 0;
    if (targetLightness > 80) {
      // 楂樹寒搴﹂鑹诧紙濡傜櫧鐨欒偆鑹诧級锛氫寒搴﹀尮閰嶉潪甯搁噸瑕?
      lightnessPenalty = lightnessDiff * 2;
    } else if (targetLightness > 60) {
      // 涓珮浜害锛氫寒搴﹀尮閰嶈緝閲嶈
      lightnessPenalty = lightnessDiff * 1;
    }

    // 鑹叉俯鍖归厤鎯╃綒锛氭殩鑹插尮閰嶅埌鍐疯壊浼氭湁棰濆鎯╃綒
    const colorWarmth = getColorWarmth(color.rgb);
    const warmthDiff = targetWarmth - colorWarmth;
    // 濡傛灉婧愯壊鏄殩鑹蹭絾鍖归厤鍒颁簡鍐疯壊锛岀粰浜堟儵缃?
    // warmthDiff > 0 琛ㄧず婧愯壊姣旂洰鏍囪壊鏇存殩
    let warmthPenalty = 0;
    // 瀵归珮浜害棰滆壊锛屽噺灏戣壊娓╂儵缃氾紙浜害鏇撮噸瑕侊級
    const warmthWeight = targetLightness > 80 ? 0.3 : (targetLightness > 60 ? 0.6 : 1.0);
    if (targetWarmth > 0.05 && colorWarmth < -0.05) {
      // 鏆栬壊鍖归厤鍒板喎鑹诧細寮烘儵缃?
      warmthPenalty = Math.abs(warmthDiff) * 60 * warmthWeight;
    } else if (targetWarmth < -0.05 && colorWarmth > 0.05) {
      // 鍐疯壊鍖归厤鍒版殩鑹诧細杞诲井鎯╃綒
      warmthPenalty = Math.abs(warmthDiff) * 30 * warmthWeight;
    }

    // 椴滆壋搴﹀亸濂斤紙鍙€夛級
    let vibrancyBonus = 0;
    if (vibrancyWeight > 0 && targetSaturation > 0.2) {
      // 姝ｅ€硷細鍋忓ソ椴滆壋棰滆壊
      vibrancyBonus = -colorSaturation * vibrancyWeight * 50;
    } else if (vibrancyWeight < 0 && targetSaturation < 0.3) {
      // 璐熷€硷細鍋忓ソ鏌斿拰棰滆壊锛堜綆楗卞拰搴﹂鑹插尮閰嶆椂鏇村亸鍚戠伆鑹诧級
      vibrancyBonus = colorSaturation * Math.abs(vibrancyWeight) * 50;
    }

    const score = distance + saturationPenalty + lightnessPenalty + warmthPenalty + vibrancyBonus;

    if (score < minScore) {
      minScore = score;
      closest = color;
    }
  }

  // 缂撳瓨缁撴灉锛堥檺鍒剁紦瀛樺ぇ灏忥級
  if (vibrancyMatchCache.size < 10000) {
    vibrancyMatchCache.set(cacheKey, closest);
  }

  return closest;
};

/**
 * 缁熻鐝犲瓙浣跨敤鏁伴噺锛堣烦杩囬€忔槑/null 鐝犲瓙锛?
 */
export const calculateBeadStatistics = (beadData: BeadPixelData): BeadStatistics[] => {
  const colorCounts = new Map<string, { color: BeadColor; count: number }>();
  let validBeadCount = 0;  // 闈為€忔槑鐝犲瓙鎬绘暟

  for (const bead of beadData.beads) {
    if (bead === null) continue;  // 璺宠繃閫忔槑鐝犲瓙
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
 * 鏅鸿兘鍚堝苟缁撴灉
 */
export interface SmartMergeResult {
  /** 鍚堝苟鍚庣殑 beadData */
  mergedData: BeadPixelData;
  /** 鍚堝苟鎶ュ憡锛氳鍚堝苟鐨勯鑹?-> 鍚堝苟鐩爣 */
  mergeReport: Array<{
    fromColor: BeadColor;
    toColor: BeadColor;
    count: number;
  }>;
  /** 鍚堝苟鍓嶉鑹叉暟 */
  beforeCount: number;
  /** 鍚堝苟鍚庨鑹叉暟 */
  afterCount: number;
}

/**
 * 鏅鸿兘鍚堝苟棰滆壊 - 灏嗕娇鐢ㄩ噺浣庝簬闃堝€肩殑棰滆壊鍚堝苟鍒版渶鐩歌繎鐨勯鑹?
 * @param beadData 鐝犲瓙鏁版嵁
 * @param threshold 闃堝€硷紙浣跨敤鏁伴噺 <= threshold 鐨勯鑹插皢琚悎骞讹級
 */
export const smartMergeColors = (
  beadData: BeadPixelData,
  threshold: number
): SmartMergeResult => {
  const stats = calculateBeadStatistics(beadData);
  const beforeCount = stats.length;

  // 鍒嗕负淇濈暀棰滆壊鍜屽緟鍚堝苟棰滆壊
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

  // 姣忎釜寰呭悎骞堕鑹叉壘鏈€杩戠殑淇濈暀棰滆壊
  const mergeReport: SmartMergeResult['mergeReport'] = [];
  const colorMapping = new Map<string, BeadColor>();

  for (const { color: fromColor, count } of mergeColors) {
    const toColor = findClosestBeadColor(fromColor.rgb, keepColors);
    colorMapping.set(fromColor.id, toColor);
    mergeReport.push({ fromColor, toColor, count });
  }

  // 搴旂敤鍚堝苟
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
 * 鍑忓皯棰滆壊鏁伴噺锛堝悎骞剁浉浼奸鑹诧級
 */
export const reduceColors = (
  beadData: BeadPixelData,
  maxColors: number,
  availableColors: BeadColor[]
): BeadPixelData => {
  // 缁熻褰撳墠浣跨敤鐨勯鑹?
  const stats = calculateBeadStatistics(beadData);

  if (stats.length <= maxColors) {
    return beadData;
  }

  // 淇濈暀浣跨敤鏈€澶氱殑棰滆壊
  const keepColors = stats.slice(0, maxColors).map(s => s.color);
  const removeColors = stats.slice(maxColors).map(s => s.color);

  // 灏嗚绉婚櫎鐨勯鑹叉槧灏勫埌鏈€鎺ヨ繎鐨勪繚鐣欓鑹?
  const colorMapping = new Map<string, BeadColor>();
  for (const removeColor of removeColors) {
    const closest = findClosestBeadColor(removeColor.rgb, keepColors);
    colorMapping.set(removeColor.id, closest);
  }

  // 搴旂敤棰滆壊鏄犲皠锛堜繚鐣欓€忔槑鐝犲瓙锛?
  const newBeads = beadData.beads.map(bead => {
    if (bead === null) return null;  // 淇濇寔閫忔槑
    const mapped = colorMapping.get(bead.id);
    return mapped || bead;
  });

  return {
    ...beadData,
    beads: newBeads,
  };
};

/**
 * 鏇挎崲鎸囧畾棰滆壊
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
 * 鎺掗櫎鎸囧畾棰滆壊锛堝皢鍏舵浛鎹负鏈€鎺ヨ繎鐨勫叾浠栭鑹诧級
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
 * 鎵句笅涓€涓浉杩戦鑹诧紙鎺掗櫎褰撳墠鑹插拰宸插皾璇曡繃鐨勯鑹诧級
 * 鐢ㄤ簬棰滆壊鏇挎崲鍔熻兘
 */
export const findNextSimilarColor = (
  currentColorId: string,
  excludeIds: string[] = []
): BeadColor | null => {
  const current = allBeadColors.find(c => c.id === currentColorId);
  if (!current) return null;

  // 鎺掗櫎褰撳墠棰滆壊鍜屽凡灏濊瘯杩囩殑棰滆壊
  const available = allBeadColors.filter(
    c => c.id !== currentColorId && !excludeIds.includes(c.id)
  );

  if (available.length === 0) return null;

  return findClosestBeadColor(current.rgb, available);
};

/**
 * 鑾峰彇鏌愪釜浣嶇疆鐨勭彔瀛愰鑹?
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
 * 璁剧疆鏌愪釜浣嶇疆鐨勭彔瀛愰鑹?
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
 * 灏嗙彔瀛愭暟鎹覆鏌撳埌 Canvas
 * @param beadData 鐝犲瓙鏁版嵁
 * @param canvas Canvas鍏冪礌
 * @param cellSize 鍗曞厓鏍煎ぇ灏?
 * @param showGrid 鏄惁鏄剧ず鍩虹缃戞牸绾?
 * @param showColorCode 鏄惁鏄剧ず棰滆壊浠ｇ爜
 * @param showMajorGrid 鏄惁鏄剧ず澶х綉鏍肩嚎锛?脳5涓瓑绾?+ 10脳10绮楃嚎锛?
 */
export const renderBeadsToCanvas = (
  beadData: BeadPixelData,
  canvas: HTMLCanvasElement,
  cellSize: number = 20,
  showGrid: boolean = true,
  showColorCode: boolean = false,
  showMajorGrid: boolean = false,
  exportOptions: ExportCoordinateOptions = {}
): void => {
  const { width, height, beads } = beadData;
  const showCoords = exportOptions.showCoords ?? false;
  const boardSize = exportOptions.boardSize ?? getExportPhysicalBoardSize(width, height);
  const pixelRatio = Math.max(1, exportOptions.pixelRatio ?? 1);
  const coordFontSize = Math.max(9, Math.round(cellSize * 0.35));
  const coordGutters = getExportCoordGutters(cellSize, showCoords);
  const patternOffsetX = coordGutters.left;
  const patternOffsetY = coordGutters.top;
  const patternWidth = width * cellSize;
  const patternHeight = height * cellSize;
  const canvasWidth = patternOffsetX + patternWidth + coordGutters.right;
  const canvasHeight = patternOffsetY + patternHeight + coordGutters.bottom;
  const physicalBoardSize = boardSize;

  canvas.width = Math.max(1, Math.round(canvasWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(canvasHeight * pixelRatio));
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // 缁樺埗姣忎釜鐝犲瓙
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const bead = beads[index];

      const px = patternOffsetX + x * cellSize;
      const py = patternOffsetY + y * cellSize;

      // 閫忔槑鐝犲瓙锛氱粯鍒舵鐩樻牸鑳屾櫙琛ㄧず鏃犵彔瀛?
      if (bead === null) {
        const checkSize = cellSize / 2;
        for (let cy = 0; cy < 2; cy++) {
          for (let cx = 0; cx < 2; cx++) {
            ctx.fillStyle = (cx + cy) % 2 === 0 ? '#e0e0e0' : '#c0c0c0';
            ctx.fillRect(px + cx * checkSize, py + cy * checkSize, checkSize, checkSize);
          }
        }
        continue;  // 璺宠繃鍚庣画鐝犲瓙缁樺埗
      }

      // 缁樺埗鑹插潡锛堢函鑹叉柟鍧楋紝涓嶅啀缁樺埗鍦嗗舰楂樺厜锛?
      ctx.fillStyle = bead.hex;
      ctx.fillRect(px, py, cellSize, cellSize);

    }
  }

  // 鏄剧ず棰滆壊浠ｇ爜锛堟瘡涓牸瀛愰兘鏄剧ず鐪熷疄鑹插彿锛?
  if (showColorCode && cellSize >= 15) {
    const fontSize = Math.max(11, Math.round(cellSize * 0.42));
    ctx.font = `700 ${fontSize}px Consolas, "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.miterLimit = 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const bead = beads[index];

        if (bead === null) {
          continue;
        }

        const px = patternOffsetX + x * cellSize;
        const py = patternOffsetY + y * cellSize;

        // 璁＄畻鑳屾櫙浜害锛氶粯璁ゆ繁鑹插瓧浣擄紝鍙湁寰堟殫鐨勮儗鏅墠鐢ㄧ櫧鑹?
        const [r, g, b] = bead.rgb;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const isDark = luminance < 0.35; // 鍙湁寰堟殫鐨勯鑹叉墠鐢ㄧ櫧瀛?
        ctx.fillStyle = isDark ? '#ffffff' : '#1a1a1a';
        ctx.strokeStyle = isDark ? '#000000' : '#ffffff';
        ctx.lineWidth = Math.max(1.2, Math.round(fontSize * 0.16));

        // Perler 鑹插彿杞崲锛?0-19001 鈫?P01, 80-15265 鈫?P265
        let displayColorId = bead.id;
        if (bead.id.startsWith('80-19') || bead.id.startsWith('80-15')) {
          const numPart = bead.id.slice(5);
          displayColorId = 'P' + parseInt(numPart, 10).toString();
        }

        const displayText = displayColorId;

        ctx.strokeText(displayText, px + cellSize / 2, py + cellSize / 2);
        ctx.fillText(displayText, px + cellSize / 2, py + cellSize / 2);
      }
    }
  }

  // 缁樺埗缃戞牸绾?
  if (showGrid) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(patternOffsetX + x * cellSize, patternOffsetY);
      ctx.lineTo(patternOffsetX + x * cellSize, patternOffsetY + patternHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(patternOffsetX, patternOffsetY + y * cellSize);
      ctx.lineTo(patternOffsetX + patternWidth, patternOffsetY + y * cellSize);
      ctx.stroke();
    }

    if (showMajorGrid) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = Math.max(2, Math.round(cellSize / 6));
      const guideOffsets = getPhysicalBoardGuideOffsets(physicalBoardSize);
      const boardCols = Math.ceil(width / physicalBoardSize);
      const boardRows = Math.ceil(height / physicalBoardSize);

      for (let boardCol = 0; boardCol < boardCols; boardCol++) {
        const originX = boardCol * physicalBoardSize;
        for (const offset of guideOffsets) {
          const guideX = originX + offset;
          if (guideX <= 0 || guideX >= width) continue;
          ctx.beginPath();
          ctx.moveTo(patternOffsetX + guideX * cellSize, patternOffsetY);
          ctx.lineTo(patternOffsetX + guideX * cellSize, patternOffsetY + patternHeight);
          ctx.stroke();
        }
      }

      for (let boardRow = 0; boardRow < boardRows; boardRow++) {
        const originY = boardRow * physicalBoardSize;
        for (const offset of guideOffsets) {
          const guideY = originY + offset;
          if (guideY <= 0 || guideY >= height) continue;
          ctx.beginPath();
          ctx.moveTo(patternOffsetX, patternOffsetY + guideY * cellSize);
          ctx.lineTo(patternOffsetX + patternWidth, patternOffsetY + guideY * cellSize);
          ctx.stroke();
        }
      }

      for (let x = 0; x <= width; x += physicalBoardSize) {
        ctx.beginPath();
        ctx.moveTo(patternOffsetX + x * cellSize, patternOffsetY);
        ctx.lineTo(patternOffsetX + x * cellSize, patternOffsetY + patternHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y += physicalBoardSize) {
        ctx.beginPath();
        ctx.moveTo(patternOffsetX, patternOffsetY + y * cellSize);
        ctx.lineTo(patternOffsetX + patternWidth, patternOffsetY + y * cellSize);
        ctx.stroke();
      }
    }
  }

  if (showCoords) {
    drawCoordsAroundPattern(
      ctx,
      patternOffsetX,
      patternOffsetY,
      patternWidth,
      patternHeight,
      width,
      height,
      cellSize,
      physicalBoardSize,
      coordFontSize,
      coordGutters,
    );
  }
};

/**
 * 鑾峰彇瀵规瘮鑹诧紙鐢ㄤ簬鏂囧瓧鏄剧ず锛?
 */
const getContrastColor = (rgb: [number, number, number]): string => {
  const [r, g, b] = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

const getExportPhysicalBoardSize = (width: number, height: number): number => {
  return getPhysicalBoardDrawSize(width, height);
};

const getBoardLocalCoordLabel = (
  globalIndex: number,
  boardSize: number
): string => {
  return `${(globalIndex % boardSize) + 1}`;
};

const getExportCoordGutters = (cellSize: number, showCoords: boolean): ExportCoordGutters => {
  if (!showCoords) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  return {
    top: Math.max(18, Math.round(cellSize * 1.1)),
    right: Math.max(22, Math.round(cellSize * 1.6)),
    bottom: Math.max(18, Math.round(cellSize * 1.1)),
    left: Math.max(22, Math.round(cellSize * 1.6)),
  };
};

const drawCoordsAroundPattern = (
  ctx: CanvasRenderingContext2D,
  patternOffsetX: number,
  patternOffsetY: number,
  patternWidth: number,
  patternHeight: number,
  width: number,
  height: number,
  cellSize: number,
  boardSize: number,
  coordFontSize: number,
  gutters: ExportCoordGutters,
  startX: number = 0,
  startY: number = 0,
) => {
  ctx.fillStyle = '#666666';
  ctx.font = `${coordFontSize}px Arial, sans-serif`;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (let x = 0; x < width; x += 5) {
    const label = getBoardLocalCoordLabel(startX + x, boardSize);
    const drawX = patternOffsetX + x * cellSize + cellSize / 2;
    ctx.fillText(label, drawX, patternOffsetY - 4);
  }

  ctx.textBaseline = 'top';
  for (let x = 0; x < width; x += 5) {
    const label = getBoardLocalCoordLabel(startX + x, boardSize);
    const drawX = patternOffsetX + x * cellSize + cellSize / 2;
    ctx.fillText(label, drawX, patternOffsetY + patternHeight + 2);
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < height; y += 5) {
    const label = getBoardLocalCoordLabel(startY + y, boardSize);
    const drawY = patternOffsetY + y * cellSize + cellSize / 2;
    ctx.fillText(label, patternOffsetX - 4, drawY);
  }

  ctx.textAlign = 'left';
  for (let y = 0; y < height; y += 5) {
    const label = getBoardLocalCoordLabel(startY + y, boardSize);
    const drawY = patternOffsetY + y * cellSize + cellSize / 2;
    ctx.fillText(label, patternOffsetX + patternWidth + 4, drawY);
  }
};

/**
 * 瀵煎嚭鐝犲瓙鍥炬涓哄浘鐗?
 * @param beadData 鐝犲瓙鏁版嵁
 * @param cellSize 鍗曞厓鏍煎ぇ灏?
 * @param showGrid 鏄惁鏄剧ず鍩虹缃戞牸绾?
 * @param showColorCode 鏄惁鏄剧ず棰滆壊浠ｇ爜
 * @param format 瀵煎嚭鏍煎紡
 * @param showMajorGrid 鏄惁鏄剧ず澶х綉鏍肩嚎锛?脳5涓瓑绾?+ 10脳10绮楃嚎锛?
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
 * 灏嗙彔瀛愭暟鎹覆鏌撳埌 Canvas锛堝甫鐝犲瓙娓呭崟锛?
 * @param beadData 鐝犲瓙鏁版嵁
 * @param canvas Canvas鍏冪礌
 * @param cellSize 鍗曞厓鏍煎ぇ灏?
 * @param showGrid 鏄惁鏄剧ず鍩虹缃戞牸绾?
 * @param showColorCode 鏄惁鏄剧ず棰滆壊浠ｇ爜
 * @param showMajorGrid 鏄惁鏄剧ず澶х綉鏍肩嚎
 * @param showBeadList 鏄惁鏄剧ず鐝犲瓙娓呭崟
 */
export const renderBeadsToCanvasWithList = (
  beadData: BeadPixelData,
  canvas: HTMLCanvasElement,
  cellSize: number = 20,
  showGrid: boolean = true,
  showColorCode: boolean = false,
  showMajorGrid: boolean = false,
  showBeadList: boolean = true,
  exportOptions: ExportCoordinateOptions = {}
): void => {
  const { width, height } = beadData;
  const showCoords = exportOptions.showCoords ?? false;
  const boardSize = exportOptions.boardSize ?? getExportPhysicalBoardSize(width, height);
  const coordFontSize = Math.max(9, Math.round(cellSize * 0.35));
  const coordGutters = getExportCoordGutters(cellSize, showCoords);
  const patternOffsetX = coordGutters.left;
  const patternOffsetY = coordGutters.top;
  const patternWidth = width * cellSize;
  const patternHeight = height * cellSize;
  const physicalBoardSize = boardSize;

  // 璁＄畻鐝犲瓙娓呭崟闇€瑕佺殑瀹藉害
  const stats = calculateBeadStatistics(beadData);
  const listPadding = Math.max(16, Math.round(cellSize * 0.8));
  const rowHeight = Math.max(24, Math.round(cellSize * 1.2));
  const colorBlockSize = Math.max(16, Math.round(cellSize * 0.8));
  const titleFontSize = Math.max(16, Math.round(cellSize * 0.8));
  const textFontSize = Math.max(12, Math.round(cellSize * 0.6));

  // 娓呭崟瀹藉害锛氭牴鎹唴瀹瑰姩鎬佽绠?
  const listWidth = showBeadList ? Math.max(200, Math.round(cellSize * 10)) : 0;

  // 璁＄畻娓呭崟闇€瑕佺殑楂樺害
  const headerHeight = listPadding * 2 + titleFontSize + rowHeight * 3; // 鏍囬 + 3琛屽熀鏈俊鎭?
  const listContentHeight = stats.length * rowHeight + listPadding * 2;
  const totalListHeight = headerHeight + listContentHeight;

  // Canvas 灏哄
  const canvasWidth = patternOffsetX + patternWidth + coordGutters.right + listWidth;
  const canvasHeight = Math.max(patternOffsetY + patternHeight + coordGutters.bottom, totalListHeight);

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 濉厖鑳屾櫙鑹?
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // ========== 缁樺埗鍥炬閮ㄥ垎 ==========
  const { beads } = beadData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const bead = beads[index];

      const px = patternOffsetX + x * cellSize;
      const py = patternOffsetY + y * cellSize;

      // 閫忔槑鐝犲瓙锛氱粯鍒舵鐩樻牸鑳屾櫙琛ㄧず鏃犵彔瀛?
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

      // 缁樺埗鑹插潡
      ctx.fillStyle = bead.hex;
      ctx.fillRect(px, py, cellSize, cellSize);
    }
  }

  // 鏄剧ず棰滆壊浠ｇ爜
  if (showColorCode && cellSize >= 15) {
    const fontSize = Math.max(11, Math.round(cellSize * 0.42));
    ctx.font = `700 ${fontSize}px Consolas, "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.miterLimit = 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const bead = beads[index];

        if (bead === null) {
          continue;
        }

        const px = patternOffsetX + x * cellSize;
        const py = patternOffsetY + y * cellSize;

        // 璁＄畻鑳屾櫙浜害锛氶粯璁ゆ繁鑹插瓧浣擄紝鍙湁寰堟殫鐨勮儗鏅墠鐢ㄧ櫧鑹?
        const [r, g, b] = bead.rgb;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const isDark = luminance < 0.35;
        ctx.fillStyle = isDark ? '#ffffff' : '#1a1a1a';
        ctx.strokeStyle = isDark ? '#000000' : '#ffffff';
        ctx.lineWidth = Math.max(1.2, Math.round(fontSize * 0.16));

        let displayColorId = bead.id;
        if (bead.id.startsWith('80-19') || bead.id.startsWith('80-15')) {
          const numPart = bead.id.slice(5);
          displayColorId = 'P' + parseInt(numPart, 10).toString();
        }

        const displayText = displayColorId;

        ctx.strokeText(displayText, px + cellSize / 2, py + cellSize / 2);
        ctx.fillText(displayText, px + cellSize / 2, py + cellSize / 2);
      }
    }
  }

  // 缁樺埗缃戞牸绾?
  if (showGrid) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(patternOffsetX + x * cellSize, patternOffsetY);
      ctx.lineTo(patternOffsetX + x * cellSize, patternOffsetY + patternHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(patternOffsetX, patternOffsetY + y * cellSize);
      ctx.lineTo(patternOffsetX + patternWidth, patternOffsetY + y * cellSize);
      ctx.stroke();
    }

    if (showMajorGrid) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = Math.max(2, Math.round(cellSize / 6));
      const guideOffsets = getPhysicalBoardGuideOffsets(physicalBoardSize);
      const boardCols = Math.ceil(width / physicalBoardSize);
      const boardRows = Math.ceil(height / physicalBoardSize);

      for (let boardCol = 0; boardCol < boardCols; boardCol++) {
        const originX = boardCol * physicalBoardSize;
        for (const offset of guideOffsets) {
          const guideX = originX + offset;
          if (guideX <= 0 || guideX >= width) continue;
          ctx.beginPath();
          ctx.moveTo(patternOffsetX + guideX * cellSize, patternOffsetY);
          ctx.lineTo(patternOffsetX + guideX * cellSize, patternOffsetY + patternHeight);
          ctx.stroke();
        }
      }

      for (let boardRow = 0; boardRow < boardRows; boardRow++) {
        const originY = boardRow * physicalBoardSize;
        for (const offset of guideOffsets) {
          const guideY = originY + offset;
          if (guideY <= 0 || guideY >= height) continue;
          ctx.beginPath();
          ctx.moveTo(patternOffsetX, patternOffsetY + guideY * cellSize);
          ctx.lineTo(patternOffsetX + patternWidth, patternOffsetY + guideY * cellSize);
          ctx.stroke();
        }
      }

      for (let x = 0; x <= width; x += physicalBoardSize) {
        ctx.beginPath();
        ctx.moveTo(patternOffsetX + x * cellSize, patternOffsetY);
        ctx.lineTo(patternOffsetX + x * cellSize, patternOffsetY + patternHeight);
        ctx.stroke();
      }

      for (let y = 0; y <= height; y += physicalBoardSize) {
        ctx.beginPath();
        ctx.moveTo(patternOffsetX, patternOffsetY + y * cellSize);
        ctx.lineTo(patternOffsetX + patternWidth, patternOffsetY + y * cellSize);
        ctx.stroke();
      }
    }
  }

  if (showCoords) {
    drawCoordsAroundPattern(
      ctx,
      patternOffsetX,
      patternOffsetY,
      patternWidth,
      patternHeight,
      width,
      height,
      cellSize,
      physicalBoardSize,
      coordFontSize,
      coordGutters,
    );
  }

  // ========== 缁樺埗鐝犲瓙娓呭崟 ==========
  if (showBeadList && listWidth > 0) {
    const listX = patternOffsetX + patternWidth + coordGutters.right;
    let currentY = listPadding;

    // 缁樺埗鍒嗛殧绾?
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(listX, 0);
    ctx.lineTo(listX, canvasHeight);
    ctx.stroke();

    // 鏍囬
    ctx.fillStyle = '#333333';
    ctx.font = `bold ${titleFontSize}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('鐝犲瓙娓呭崟', listX + listPadding, currentY);
    currentY += titleFontSize + listPadding;

    // 鍩烘湰淇℃伅
    ctx.font = `${textFontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#666666';

    const validBeadCount = beads.filter(b => b !== null).length;

    ctx.fillText(`尺寸: ${width} × ${height}`, listX + listPadding, currentY);
    currentY += rowHeight * 0.8;

    ctx.fillText(`珠子: ${validBeadCount} 颗`, listX + listPadding, currentY);
    currentY += rowHeight * 0.8;

    ctx.fillText(`颜色: ${stats.length} 种`, listX + listPadding, currentY);
    currentY += rowHeight * 1.2;

    // 鍒嗛殧绾?
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(listX + listPadding, currentY);
    ctx.lineTo(listX + listWidth - listPadding, currentY);
    ctx.stroke();
    currentY += listPadding;

    // 棰滆壊鍒楄〃
    for (const stat of stats) {
      // 妫€鏌ユ槸鍚﹁秴鍑虹敾甯冮珮搴?
      if (currentY + rowHeight > canvasHeight - listPadding) {
        ctx.fillStyle = '#999999';
        ctx.font = `${textFontSize}px Arial, sans-serif`;
        ctx.fillText('...鏇村棰滆壊', listX + listPadding, currentY);
        break;
      }

      // 鑹插潡
      ctx.fillStyle = stat.color.hex;
      ctx.fillRect(listX + listPadding, currentY, colorBlockSize, colorBlockSize);

      // 鑹插潡杈规
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(listX + listPadding, currentY, colorBlockSize, colorBlockSize);

      // 棰滆壊鍚嶇О鍜屾暟閲?
      ctx.fillStyle = '#333333';
      ctx.font = `${textFontSize}px Arial, sans-serif`;
      ctx.textBaseline = 'middle';

      // 棰滆壊鍚嶏紙涓枃鍚嶄紭鍏堬紝瓒呴暱鍒欐埅鏂級
      const colorName = stat.color.nameCN || stat.color.name;
      const maxNameWidth = listWidth - listPadding * 2 - colorBlockSize - 60;
      let displayName = colorName;

      // 娴嬮噺骞舵埅鏂?
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

      // 鏁伴噺锛堝彸瀵归綈锛?
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
 * 鐢熸垚鐝犲瓙娓呭崟鏂囨湰
 */
export const generateBeadList = (beadData: BeadPixelData): string => {
  const stats = calculateBeadStatistics(beadData);
  const totalBeads = beadData.beads.length;

  let text = '=== 鐝犲瓙娓呭崟 ===\n\n';
  text += `鍥炬灏哄: ${beadData.width} x ${beadData.height}\n`;
  text += `鐝犲瓙鎬绘暟: ${totalBeads} 棰梊n`;
  text += `浣跨敤棰滆壊: ${stats.length} 绉峔n\n`;
  text += '--- 棰滆壊鏄庣粏 ---\n\n';

  stats.forEach((stat, index) => {
    text += `${index + 1}. ${stat.color.id} ${stat.color.nameCN}(${stat.color.name}): ${stat.count} 棰?(${stat.percentage.toFixed(1)}%)\n`;
  });

  return text;
};

/**
 * 鎸夋嫾璞嗘澘鍒嗛〉娓叉煋
 * @param beadData 瀹屾暣鍥炬鏁版嵁
 * @param cellSize 姣忔牸鍍忕礌澶у皬
 * @param boardSize 鎷艰眴鏉垮昂瀵革紙濡?29x29锛?
 * @param options 娓叉煋閫夐」
 * @returns 姣忛〉鐨?canvas 鏁扮粍
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
    showColorCode?: boolean;
  } = {}
): PaginatedPage[] => {
  const { width, height } = beadData;
  const { showGrid = true, showCoords = true, showMajorGrid = true, showColorCode = true } = options;
  const physicalBoardSize = boardSize;
  const coordFontSize = Math.max(9, Math.round(cellSize * 0.34));
  const coordGutters = getExportCoordGutters(cellSize, showCoords);

  const cols = Math.ceil(width / boardSize);
  const rows = Math.ceil(height / boardSize);
  const totalPages = rows * cols;
  const pages: PaginatedPage[] = [];

  const headerHeight = Math.max(44, Math.round(cellSize * 2.8));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const startX = col * boardSize;
      const startY = row * boardSize;
      const endX = Math.min(startX + boardSize, width);
      const endY = Math.min(startY + boardSize, height);
      const pageW = endX - startX;
      const pageH = endY - startY;

      const canvas = document.createElement('canvas');
      const patternWidth = pageW * cellSize;
      const patternHeight = pageH * cellSize;
      const patternOffsetX = coordGutters.left;
      const patternOffsetY = headerHeight;
      const canvasW = patternOffsetX + patternWidth + coordGutters.right;
      const canvasH = patternOffsetY + patternHeight + coordGutters.bottom;
      canvas.width = canvasW;
      canvas.height = canvasH;

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const pageNum = row * cols + col + 1;
      ctx.fillStyle = '#f7f4ff';
      ctx.fillRect(0, 0, canvasW, headerHeight);
      ctx.strokeStyle = 'rgba(82, 58, 140, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, headerHeight - 0.5);
      ctx.lineTo(canvasW, headerHeight - 0.5);
      ctx.stroke();

      ctx.fillStyle = '#45306b';
      ctx.font = `bold ${Math.max(14, cellSize * 0.62)}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `打印版图纸 · 第 ${pageNum}/${totalPages} 页`,
        12,
        Math.round(headerHeight * 0.42)
      );

      ctx.fillStyle = '#6f6290';
      ctx.font = `${Math.max(10, cellSize * 0.34)}px Arial, sans-serif`;
      ctx.fillText(
        `板区 ${row + 1}-${col + 1} · 板规格 ${boardSize} · 列 ${getBoardLocalCoordLabel(startX, physicalBoardSize)}-${getBoardLocalCoordLabel(endX - 1, physicalBoardSize)} · 行 ${getBoardLocalCoordLabel(startY, physicalBoardSize)}-${getBoardLocalCoordLabel(endY - 1, physicalBoardSize)}`,
        12,
        Math.round(headerHeight * 0.76)
      );

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const bead = beadData.beads[y * width + x];
          const px = patternOffsetX + (x - startX) * cellSize;
          const py = patternOffsetY + (y - startY) * cellSize;

          if (bead) {
            ctx.fillStyle = bead.hex;
            ctx.fillRect(px, py, cellSize, cellSize);
          } else {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#f0f0f0' : '#e0e0e0';
            ctx.fillRect(px, py, cellSize, cellSize);
          }
        }
      }

      if (showColorCode && cellSize >= 15) {
        const fontSize = Math.max(11, Math.round(cellSize * 0.42));
        ctx.font = `700 ${fontSize}px Consolas, "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.miterLimit = 2;

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const bead = beadData.beads[y * width + x];
            if (bead === null) {
              continue;
            }

            const px = patternOffsetX + (x - startX) * cellSize;
            const py = patternOffsetY + (y - startY) * cellSize;
            const isDark = getContrastColor(bead.rgb) === '#ffffff';
            ctx.fillStyle = isDark ? '#ffffff' : '#1a1a1a';
            ctx.strokeStyle = isDark ? '#000000' : '#ffffff';
            ctx.lineWidth = Math.max(1.2, Math.round(fontSize * 0.16));

            let displayColorId = bead.id;
            if (bead.id.startsWith('80-19') || bead.id.startsWith('80-15')) {
              const numPart = bead.id.slice(5);
              displayColorId = 'P' + parseInt(numPart, 10).toString();
            }

            const displayText = displayColorId;

            ctx.strokeText(displayText, px + cellSize / 2, py + cellSize / 2);
            ctx.fillText(displayText, px + cellSize / 2, py + cellSize / 2);
          }
        }
      }

      if (showGrid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= pageW; x++) {
          ctx.beginPath();
          ctx.moveTo(patternOffsetX + x * cellSize, patternOffsetY);
          ctx.lineTo(patternOffsetX + x * cellSize, patternOffsetY + pageH * cellSize);
          ctx.stroke();
        }
        for (let y = 0; y <= pageH; y++) {
          ctx.beginPath();
          ctx.moveTo(patternOffsetX, patternOffsetY + y * cellSize);
          ctx.lineTo(patternOffsetX + pageW * cellSize, patternOffsetY + y * cellSize);
          ctx.stroke();
        }
      }

      if (showMajorGrid) {
        ctx.strokeStyle = 'rgba(0,0,0,0.78)';
        ctx.lineWidth = 1.5;
        const guideOffsets = getPhysicalBoardGuideOffsets(physicalBoardSize);

        for (let x = 0; x <= pageW; x++) {
          if ((startX + x) % physicalBoardSize === 0) {
            ctx.beginPath();
            ctx.moveTo(patternOffsetX + x * cellSize, patternOffsetY);
            ctx.lineTo(patternOffsetX + x * cellSize, patternOffsetY + pageH * cellSize);
            ctx.stroke();
          }
        }
        for (let y = 0; y <= pageH; y++) {
          if ((startY + y) % physicalBoardSize === 0) {
            ctx.beginPath();
            ctx.moveTo(patternOffsetX, patternOffsetY + y * cellSize);
            ctx.lineTo(patternOffsetX + pageW * cellSize, patternOffsetY + y * cellSize);
            ctx.stroke();
          }
        }

        for (const offset of guideOffsets) {
          for (let boardStartX = Math.floor(startX / physicalBoardSize) * physicalBoardSize; boardStartX < endX; boardStartX += physicalBoardSize) {
            const guideX = boardStartX + offset;
            if (guideX <= startX || guideX >= endX) continue;
            ctx.beginPath();
            ctx.moveTo(patternOffsetX + (guideX - startX) * cellSize, patternOffsetY);
            ctx.lineTo(patternOffsetX + (guideX - startX) * cellSize, patternOffsetY + pageH * cellSize);
            ctx.stroke();
          }
          for (let boardStartY = Math.floor(startY / physicalBoardSize) * physicalBoardSize; boardStartY < endY; boardStartY += physicalBoardSize) {
            const guideY = boardStartY + offset;
            if (guideY <= startY || guideY >= endY) continue;
            ctx.beginPath();
            ctx.moveTo(patternOffsetX, patternOffsetY + (guideY - startY) * cellSize);
            ctx.lineTo(patternOffsetX + pageW * cellSize, patternOffsetY + (guideY - startY) * cellSize);
            ctx.stroke();
          }
        }
      }

      if (showCoords) {
        drawCoordsAroundPattern(
          ctx,
          patternOffsetX,
          patternOffsetY,
          patternWidth,
          patternHeight,
          pageW,
          pageH,
          cellSize,
          physicalBoardSize,
          coordFontSize,
          coordGutters,
          startX,
          startY,
        );
      }

      ctx.strokeStyle = 'rgba(53, 36, 92, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(patternOffsetX, patternOffsetY, patternWidth, patternHeight);

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


