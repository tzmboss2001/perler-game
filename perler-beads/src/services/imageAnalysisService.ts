/**
 * 图片分析服务
 * 分析图片复杂度，推荐合适的网格宽度和颜色上限。
 */

export interface ImageAnalysisResult {
  edgeDensity: number; // 边缘密度 0-1
  colorComplexity: number; // 颜色复杂度 0-1
  overallComplexity: number; // 综合复杂度 0-1
  recommendedWidth: number; // 推荐的网格宽度
  recommendedColorCount: number; // 推荐颜色上限（仅用于算法建议，不代表官方色板）
  recommendation: string; // 推荐说明
}

/**
 * 分析图片并推荐网格宽度
 * @param imageSource 图片源（base64 或 URL）
 * @returns 分析结果
 */
export const analyzeImage = async (imageSource: string): Promise<ImageAnalysisResult> => {
  const image = await loadImage(imageSource);
  return analyzeFromImage(image);
};

/**
 * 加载图片
 */
const loadImage = (source: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = source;
  });
};

/**
 * 从图片分析复杂度
 */
const analyzeFromImage = (image: HTMLImageElement): ImageAnalysisResult => {
  // 创建分析用的小尺寸 canvas，降低计算成本
  const analysisSize = 100;
  const canvas = document.createElement("canvas");
  const aspectRatio = image.height / image.width;
  canvas.width = analysisSize;
  canvas.height = Math.round(analysisSize * aspectRatio);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // 计算边缘密度（使用 Sobel 算子的简化版）
  const edgeDensity = calculateEdgeDensity(imageData);

  // 计算颜色复杂度
  const colorComplexity = calculateColorComplexity(imageData);

  // 综合复杂度（边缘权重更高，因为边缘细节在拼豆中更重要）
  const overallComplexity = edgeDensity * 0.6 + colorComplexity * 0.4;

  // 基于复杂度推荐网格宽度
  const { recommendedWidth, recommendation } = getRecommendation(
    overallComplexity,
    image.width,
    image.height
  );

  // 推荐颜色上限：只表示精简建议，不代表官方色板方案
  const recommendedColorCount = getRecommendedColorCount(overallComplexity);

  return {
    edgeDensity,
    colorComplexity,
    overallComplexity,
    recommendedWidth,
    recommendedColorCount,
    recommendation,
  };
};

/**
 * 计算边缘密度（简化版 Sobel 算子）
 */
const calculateEdgeDensity = (imageData: ImageData): number => {
  const { data, width, height } = imageData;
  let edgeSum = 0;
  let pixelCount = 0;

  // 遍历像素（跳过边缘）
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const getGray = (i: number) => {
        return (data[i] + data[i + 1] + data[i + 2]) / 3;
      };

      const left = getGray((y * width + (x - 1)) * 4);
      const right = getGray((y * width + (x + 1)) * 4);
      const top = getGray(((y - 1) * width + x) * 4);
      const bottom = getGray(((y + 1) * width + x) * 4);

      const gx = Math.abs(right - left);
      const gy = Math.abs(bottom - top);
      const gradient = Math.sqrt(gx * gx + gy * gy);

      edgeSum += gradient;
      pixelCount++;
    }
  }

  const avgGradient = edgeSum / pixelCount;
  return Math.min(1, avgGradient / 100);
};

/**
 * 计算颜色复杂度
 */
const calculateColorComplexity = (imageData: ImageData): number => {
  const { data, width, height } = imageData;
  const colorSet = new Set<string>();
  let gradientSum = 0;
  let pixelCount = 0;

  // 统计独立颜色数量（量化到 32 级）
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.floor(data[i] / 8) * 8;
    const g = Math.floor(data[i + 1] / 8) * 8;
    const b = Math.floor(data[i + 2] / 8) * 8;
    colorSet.add(`${r},${g},${b}`);
  }

  // 计算相邻像素的颜色差异（渐变检测）
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;
      const bottomIdx = ((y + 1) * width + x) * 4;

      const diffRight = colorDiff(data, idx, rightIdx);
      const diffBottom = colorDiff(data, idx, bottomIdx);

      gradientSum += (diffRight + diffBottom) / 2;
      pixelCount++;
    }
  }

  // 综合颜色数量和渐变程度
  const colorCountScore = Math.min(1, colorSet.size / 500);
  const gradientScore = Math.min(1, (gradientSum / pixelCount) / 50);

  return colorCountScore * 0.4 + gradientScore * 0.6;
};

/**
 * 计算两个像素的颜色差异
 */
const colorDiff = (data: Uint8ClampedArray, idx1: number, idx2: number): number => {
  const dr = data[idx1] - data[idx2];
  const dg = data[idx1 + 1] - data[idx2 + 1];
  const db = data[idx1 + 2] - data[idx2 + 2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

/**
 * 根据复杂度推荐网格宽度
 */
const getRecommendation = (
  complexity: number,
  originalWidth: number,
  originalHeight: number
): { recommendedWidth: number; recommendation: string } => {
  let baseWidth: number;
  let description: string;

  if (complexity < 0.15) {
    baseWidth = 32;
    description = "简单图案";
  } else if (complexity < 0.25) {
    baseWidth = 42;
    description = "较简单图案";
  } else if (complexity < 0.35) {
    baseWidth = 52;
    description = "中等复杂度图案";
  } else if (complexity < 0.5) {
    baseWidth = 64;
    description = "较复杂图案";
  } else if (complexity < 0.65) {
    baseWidth = 80;
    description = "复杂图案";
  } else {
    baseWidth = 104;
    description = "高细节图案";
  }

  // 考虑原图比例：如果原图很小，不要推荐太大的网格
  const maxReasonableWidth = Math.max(32, Math.min(originalWidth / 3, 104));
  const recommendedWidth = Math.min(baseWidth, maxReasonableWidth);

  // 对齐到标准板子规格（取最近的规格）
  const standardSizes = [32, 42, 52, 64, 80, 104, 156, 208];
  const alignedWidth = standardSizes.reduce((prev, curr) =>
    Math.abs(curr - recommendedWidth) < Math.abs(prev - recommendedWidth) ? curr : prev
  );

  return {
    recommendedWidth: alignedWidth,
    recommendation: description,
  };
};

/**
 * 获取标准板子规格选项
 * 注意：为性能考虑，UI 上限限制在 104
 * 更大尺寸可通过编辑页滑动条手动调整
 */
export const STANDARD_BOARD_SIZES = [
  { value: 32, label: "32", description: "适合简单图案" },
  { value: 42, label: "42", description: "适合简单卡通" },
  { value: 52, label: "52", description: "标准 52 针小板" },
  { value: 64, label: "64", description: "适合中等复杂图案" },
  { value: 80, label: "80", description: "适合复杂图案" },
  { value: 104, label: "104", description: "标准 104 针大板" },
];

/**
 * 获取推荐颜色上限
 * 返回值只用于算法精简建议，不代表官方色板方案
 */
const getRecommendedColorCount = (complexity: number): number => {
  if (complexity < 0.15) return 48;
  if (complexity < 0.25) return 72;
  if (complexity < 0.4) return 96;
  if (complexity < 0.65) return 150;
  if (complexity < 0.8) return 200;
  return 291;
};
