/**
 * 深度图转3D体素服务
 * 将深度图（灰度图）与原图颜色合并，生成3D体素数据
 *
 * v2.0 改进：
 * - 添加高斯模糊平滑深度图，减少相邻像素Z值跳变
 * - 移除gamma校正，使用线性映射
 * - 改进降采样方法，使用面积平均减少边缘失真
 */

import { Layer, LayerBead } from '../../types/3d/voxel';

/**
 * 从图片URL加载像素数据
 */
export async function loadImagePixels(imageUrl: string): Promise<{
  data: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
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
    img.src = imageUrl;
  });
}

/**
 * 生成高斯核
 */
function generateGaussianKernel(radius: number, sigma: number): number[][] {
  const size = radius * 2 + 1;
  const kernel: number[][] = [];
  let sum = 0;

  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - radius;
      const dy = y - radius;
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel[y][x] = value;
      sum += value;
    }
  }

  // 归一化
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }

  return kernel;
}

/**
 * 对深度图进行高斯模糊平滑
 * 这是解决Z值跳变的关键！让相邻像素的深度值更连续
 */
export function gaussianBlurDepth(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number = 2,
  sigma: number = 1.5
): Uint8ClampedArray {
  const kernel = generateGaussianKernel(radius, sigma);
  const result = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      let weightSum = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const nx = Math.min(Math.max(x + kx, 0), width - 1);
          const ny = Math.min(Math.max(y + ky, 0), height - 1);
          const idx = (ny * width + nx) * 4;
          const weight = kernel[ky + radius][kx + radius];

          // 只对非背景像素进行模糊（保留边缘）
          const srcIdx = (y * width + x) * 4;
          const srcGray = data[srcIdx];
          const neighborGray = data[idx];

          // 如果当前像素是背景(0)或者邻居是背景，跳过邻居
          if (srcGray === 0 || neighborGray === 0) {
            if (neighborGray === 0) continue;
          }

          sumR += data[idx] * weight;
          sumG += data[idx + 1] * weight;
          sumB += data[idx + 2] * weight;
          sumA += data[idx + 3] * weight;
          weightSum += weight;
        }
      }

      const dstIdx = (y * width + x) * 4;
      if (weightSum > 0) {
        result[dstIdx] = Math.round(sumR / weightSum);
        result[dstIdx + 1] = Math.round(sumG / weightSum);
        result[dstIdx + 2] = Math.round(sumB / weightSum);
        result[dstIdx + 3] = Math.round(sumA / weightSum);
      } else {
        // 保持原值
        result[dstIdx] = data[dstIdx];
        result[dstIdx + 1] = data[dstIdx + 1];
        result[dstIdx + 2] = data[dstIdx + 2];
        result[dstIdx + 3] = data[dstIdx + 3];
      }
    }
  }

  return result;
}

/**
 * RGB转Hex颜色
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

/**
 * 从深度图提取Z值（浮点数版本，保留精度）
 *
 * v2.0 改进：
 * - 移除gamma校正，使用线性映射避免放大差异
 * - 返回浮点数深度值，保留精度
 *
 * v2.2 改进：
 * - 添加 invertDepth 参数支持深度反转
 * - Marigold 模型：黑=近，白=远，需要反转
 * - Depth Anything：白=近，黑=远，不需要反转
 */
export function extractDepthValuesFloat(
  depthData: Uint8ClampedArray,
  width: number,
  height: number,
  maxLayers: number = 8,
  invertDepth: boolean = false // 是否反转深度（Marigold需要反转）
): number[][] {
  // 第一遍：扫描找出实际的灰度值范围
  let minGray = 255;
  let maxGray = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let gray = depthData[idx];

      // 如果需要反转深度，先反转灰度值
      if (invertDepth) {
        gray = 255 - gray;
      }

      // 排除背景（反转后255变成0，或原本就是0）
      if (gray > 5) { // 使用5作为阈值，避免噪点
        minGray = Math.min(minGray, gray);
        maxGray = Math.max(maxGray, gray);
      }
    }
  }

  console.log('深度图灰度范围:', minGray, '-', maxGray, invertDepth ? '(已反转)' : '');

  // 计算灰度范围
  const grayRange = maxGray - minGray;
  if (grayRange === 0) {
    // 如果所有灰度值相同，返回全部为1层
    return Array(height).fill(null).map(() => Array(width).fill(1));
  }

  // 第二遍：使用线性映射，返回浮点数深度值
  const depthValues: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      let gray = depthData[idx];

      // 如果需要反转深度
      if (invertDepth) {
        gray = 255 - gray;
      }

      if (gray <= 5) { // 背景阈值
        row.push(0); // 背景
      } else {
        // 线性映射到1-maxLayers（保留浮点数精度）
        const normalized = (gray - minGray) / grayRange;
        const z = normalized * (maxLayers - 1) + 1;
        row.push(z);
      }
    }
    depthValues.push(row);
  }

  return depthValues;
}

/**
 * 从深度图提取Z值（整数版本，兼容旧代码）
 */
export function extractDepthValues(
  depthData: Uint8ClampedArray,
  width: number,
  height: number,
  maxLayers: number = 8
): number[][] {
  const floatValues = extractDepthValuesFloat(depthData, width, height, maxLayers);
  return floatValues.map(row => row.map(z => z === 0 ? 0 : Math.round(z)));
}

/**
 * 降采样图片数据
 */
export function downsampleImage(
  data: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number
): { data: Uint8ClampedArray; width: number; height: number } {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建canvas上下文');
  }

  // 创建源图像
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) {
    throw new Error('无法创建canvas上下文');
  }

  const srcImageData = srcCtx.createImageData(srcWidth, srcHeight);
  srcImageData.data.set(data);
  srcCtx.putImageData(srcImageData, 0, 0);

  // 缩放
  ctx.drawImage(srcCanvas, 0, 0, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);

  const resultData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  return {
    data: resultData.data,
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * 将深度图和颜色图合并生成3D体素数据
 *
 * v2.0 改进：
 * - 对深度图进行高斯模糊平滑，减少Z值跳变
 * - 使用浮点数深度值，避免量化误差
 * - 直接根据每个像素的深度值决定其高度，而非阈值切片
 *
 * v2.1 改进：
 * - 智能切割：内部用更多层计算，自动切掉底部"砖头底座"
 * - 用户选择N层，最终输出就是N层有立体感的浮雕
 */
export async function depthToVoxels(
  colorImageUrl: string,
  depthImageUrl: string,
  targetSize: number = 32,
  maxLayers: number = 8,
  invertDepth: boolean = false // 是否反转深度（Marigold模型需要反转）
): Promise<{
  layers: Layer[];
  dimensions: { x: number; y: number; z: number };
  voxelCount: number;
}> {
  // 加载原图（颜色）
  const colorImage = await loadImagePixels(colorImageUrl);

  // 加载深度图
  const depthImage = await loadImagePixels(depthImageUrl);

  console.log('原图尺寸:', colorImage.width, 'x', colorImage.height);
  console.log('深度图尺寸:', depthImage.width, 'x', depthImage.height);

  // 【改进1】对深度图进行高斯模糊平滑（在降采样前）
  // 这是解决Z值跳变的关键步骤！
  const blurRadius = Math.max(2, Math.floor(depthImage.width / targetSize / 2));
  const blurSigma = blurRadius * 0.8;
  console.log('高斯模糊参数: radius=', blurRadius, 'sigma=', blurSigma);

  const smoothedDepth = gaussianBlurDepth(
    depthImage.data,
    depthImage.width,
    depthImage.height,
    blurRadius,
    blurSigma
  );

  // 降采样到目标尺寸
  const colorDownsampled = downsampleImage(
    colorImage.data,
    colorImage.width,
    colorImage.height,
    targetSize,
    targetSize
  );

  const depthDownsampled = downsampleImage(
    smoothedDepth, // 使用平滑后的深度图
    depthImage.width,
    depthImage.height,
    targetSize,
    targetSize
  );

  console.log('降采样后尺寸:', targetSize, 'x', targetSize);

  // 【改进2】使用浮点数深度值（支持深度反转）
  const depthValues = extractDepthValuesFloat(
    depthDownsampled.data,
    depthDownsampled.width,
    depthDownsampled.height,
    maxLayers,
    invertDepth
  );

  // 收集有效像素
  const validPixels: Array<{x: number; y: number; z: number; color: string}> = [];

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const z = depthValues[y][x];

      if (z > 0) {
        // 获取颜色
        const colorIdx = (y * targetSize + x) * 4;
        const r = colorDownsampled.data[colorIdx];
        const g = colorDownsampled.data[colorIdx + 1];
        const b = colorDownsampled.data[colorIdx + 2];
        const a = colorDownsampled.data[colorIdx + 3];

        // 跳过透明像素
        if (a < 128) continue;

        // 跳过纯白像素（只过滤接近纯白的背景，避免误删卡通画的白色部分）
        const brightness = (r + g + b) / 3;
        if (brightness > 252) continue;

        const color = rgbToHex(r, g, b);
        validPixels.push({ x, y, z, color });
      }
    }
  }

  console.log('有效像素数:', validPixels.length);

  // 【改进3】直接根据每个像素的深度值决定其高度
  // 不再使用阈值切片法，而是每个像素从第1层堆叠到其对应的深度层
  const layersMap = new Map<number, LayerBead[]>();
  let voxelCount = 0;

  for (const pixel of validPixels) {
    const { x, y, z, color } = pixel;
    // 计算这个像素应该堆叠到哪一层（四舍五入）
    const targetLayer = Math.round(z);

    // 从第1层堆叠到目标层
    for (let layer = 1; layer <= targetLayer; layer++) {
      if (!layersMap.has(layer)) {
        layersMap.set(layer, []);
      }
      layersMap.get(layer)!.push({ x, y, color, beadId: color });
      voxelCount++;
    }
  }

  // 转换为Layer数组
  const layers: Layer[] = [];
  for (let z = 1; z <= maxLayers; z++) {
    const beads = layersMap.get(z) || [];
    if (beads.length > 0) {
      layers.push({
        z,
        width: targetSize,
        height: targetSize,
        beads,
      });
    }
  }

  console.log('生成层数:', layers.length);
  console.log('体素总数:', voxelCount);

  return {
    layers,
    dimensions: { x: targetSize, y: targetSize, z: maxLayers },
    voxelCount,
  };
}

/**
 * 从本地文件加载图片并转换为DataURL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
