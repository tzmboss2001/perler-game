/**
 * 深度估计服务
 * 使用 Depth Anything V2 (Replicate API) 生成深度图
 */

import { DepthEstimationResult, DepthData } from '../../types/3d/voxel';

// Depth Anything V2 模型版本
const DEPTH_MODEL_VERSION = 'b239ea33cff32bb7abb5db39ffe9a09c14cbc2894331d1ef66fe096eed88ebd4';

// API基础URL（后端代理）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8012';

/**
 * 调用深度估计API
 * @param imageDataUrl 图片的 base64 data URL
 * @returns 深度估计结果
 */
export async function estimateDepth(imageDataUrl: string): Promise<DepthEstimationResult> {
  try {
    // 通过后端代理调用 Replicate API（避免暴露 API Token）
    const response = await fetch(`${API_BASE_URL}/api/v1/depth/estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageDataUrl,
        model_version: DEPTH_MODEL_VERSION,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `API请求失败: ${response.status} - ${error}`,
      };
    }

    const result = await response.json();

    if (result.code === 0 && result.data) {
      return {
        success: true,
        depthImageUrl: result.data.depth_url,
        colorDepthUrl: result.data.color_depth_url,
      };
    } else {
      return {
        success: false,
        error: result.msg || '深度估计失败',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 从深度图URL加载深度数据
 * @param depthImageUrl 深度图URL
 * @returns 深度数据矩阵
 */
export async function loadDepthData(depthImageUrl: string): Promise<DepthData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // 提取深度值（灰度图，取R通道即可）
      const pixels: number[][] = [];
      for (let y = 0; y < img.height; y++) {
        const row: number[] = [];
        for (let x = 0; x < img.width; x++) {
          const index = (y * img.width + x) * 4;
          // 灰度深度图：白色(255)=近，黑色(0)=远
          row.push(imageData.data[index]);
        }
        pixels.push(row);
      }

      resolve({
        width: img.width,
        height: img.height,
        pixels,
      });
    };

    img.onerror = () => {
      reject(new Error('加载深度图失败'));
    };

    img.src = depthImageUrl;
  });
}

/**
 * 从本地图片生成智能深度数据（纯算法，无需AI）
 * 改进版：骨架提取 + 距离组合 + 层数离散化 + 文字检测
 *
 * 算法策略：
 * 1. 检测前景蒙版（透明度/颜色分离）
 * 2. 计算复杂度，判断是否为文字/Logo
 * 3. 文字类：固定深度 + 边缘倒角
 * 4. 图形类：骨架提取 + 双距离组合
 * 5. 层数离散化（台阶效果）
 *
 * @param imageDataUrl 图片的 base64 data URL
 * @returns 智能深度数据
 */
export async function generateMockDepth(imageDataUrl: string): Promise<DepthData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // 限制最大处理尺寸，防止内存溢出
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        // 如果图片太大，按比例缩小
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        // 第一步：创建前景蒙版
        const foregroundMask = createForegroundMask(imageData, width, height);

        // 第二步：计算复杂度，判断是否为文字/Logo
        const { perimeter, area } = computeShapeMetrics(foregroundMask, width, height);
        const complexity = area > 0 ? (perimeter * perimeter) / area : 0;
        const isTextOrLogo = complexity > 80; // 复杂度阈值

        let pixels: number[][];

        if (isTextOrLogo) {
          // 文字/Logo模式：固定深度 + 边缘倒角
          pixels = generateTextDepth(foregroundMask, width, height);
        } else {
          // 图形模式：骨架 + 距离组合
          pixels = generateShapeDepth(foregroundMask, width, height);
        }

        resolve({
          width,
          height,
          pixels,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('加载图片失败'));
    };

    img.src = imageDataUrl;
  });
}

/**
 * 创建前景蒙版
 */
function createForegroundMask(
  imageData: ImageData,
  width: number,
  height: number
): boolean[][] {
  // 检测是否有透明像素
  let hasTransparency = false;
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] < 250) {
      hasTransparency = true;
      break;
    }
  }

  const foregroundMask: boolean[][] = [];

  if (hasTransparency) {
    // 有透明通道：用透明度判断前景
    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const a = imageData.data[index + 3];
        row.push(a >= 128);
      }
      foregroundMask.push(row);
    }
  } else {
    // 无透明通道：用边缘颜色作为背景色
    const corners = [
      0,
      (width - 1) * 4,
      (height - 1) * width * 4,
      ((height - 1) * width + width - 1) * 4,
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    for (const idx of corners) {
      bgR += imageData.data[idx];
      bgG += imageData.data[idx + 1];
      bgB += imageData.data[idx + 2];
    }
    bgR = Math.round(bgR / 4);
    bgG = Math.round(bgG / 4);
    bgB = Math.round(bgB / 4);

    const colorThreshold = 50;

    for (let y = 0; y < height; y++) {
      const row: boolean[] = [];
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const r = imageData.data[index];
        const g = imageData.data[index + 1];
        const b = imageData.data[index + 2];
        const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        row.push(diff > colorThreshold);
      }
      foregroundMask.push(row);
    }
  }

  return foregroundMask;
}

/**
 * 计算形状的周长和面积
 */
function computeShapeMetrics(
  mask: boolean[][],
  width: number,
  height: number
): { perimeter: number; area: number } {
  let area = 0;
  let perimeter = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x]) {
        area++;
        // 检查四个方向是否是边界
        if (x === 0 || !mask[y][x - 1]) perimeter++;
        if (x === width - 1 || !mask[y][x + 1]) perimeter++;
        if (y === 0 || !mask[y - 1][x]) perimeter++;
        if (y === height - 1 || !mask[y + 1][x]) perimeter++;
      }
    }
  }

  return { perimeter, area };
}

/**
 * 文字/Logo模式：固定深度 + 边缘倒角
 */
function generateTextDepth(
  mask: boolean[][],
  width: number,
  height: number
): number[][] {
  const distanceMap = computeDistanceTransform(mask, width, height);
  const pixels: number[][] = [];

  // 文字模式：最大3层，边缘倒角
  const MAX_TEXT_DEPTH = 3;

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (!mask[y][x]) {
        row.push(0);
      } else {
        const dist = distanceMap[y][x];
        // 边缘1层，中间3层
        let depth: number;
        if (dist <= 1) {
          depth = 1;
        } else if (dist <= 2) {
          depth = 2;
        } else {
          depth = MAX_TEXT_DEPTH;
        }
        // 转换为0-255范围（用于后续处理）
        row.push(Math.round((depth / MAX_TEXT_DEPTH) * 255));
      }
    }
    pixels.push(row);
  }

  return pixels;
}

/**
 * 图形模式：骨架 + 距离组合
 */
function generateShapeDepth(
  mask: boolean[][],
  width: number,
  height: number
): number[][] {
  // 计算到边缘的距离
  const distanceToEdge = computeDistanceTransform(mask, width, height);

  // 提取骨架
  const skeleton = extractSkeleton(mask, width, height);

  // 计算到骨架的距离
  const distanceToSkeleton = computeDistanceTransform(skeleton, width, height);

  // 找到最大距离值
  let maxEdgeDist = 0;
  let maxSkelDist = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x]) {
        if (distanceToEdge[y][x] > maxEdgeDist) maxEdgeDist = distanceToEdge[y][x];
        if (distanceToSkeleton[y][x] > maxSkelDist) maxSkelDist = distanceToSkeleton[y][x];
      }
    }
  }

  const pixels: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (!mask[y][x]) {
        row.push(0);
      } else {
        // 组合深度：边缘距离 + 骨架距离
        const edgeNorm = maxEdgeDist > 0 ? distanceToEdge[y][x] / maxEdgeDist : 0;
        const skelNorm = maxSkelDist > 0 ? 1 - (distanceToSkeleton[y][x] / maxSkelDist) : 1;

        // 深度 = 0.6 * 边缘距离 + 0.4 * 骨架接近度
        let depth = 0.6 * edgeNorm + 0.4 * skelNorm;

        // 非线性压缩，避免中间过高
        depth = Math.sqrt(depth);

        // 层数离散化：分成5个台阶
        const level = discretizeDepth(depth, 5);

        row.push(Math.round((level / 5) * 255));
      }
    }
    pixels.push(row);
  }

  return pixels;
}

/**
 * 层数离散化：将连续深度分成几个台阶
 */
function discretizeDepth(depth: number, levels: number): number {
  // depth: 0-1, 返回 1-levels
  const level = Math.ceil(depth * levels);
  return Math.max(1, Math.min(levels, level));
}

/**
 * 骨架提取（Zhang-Suen细化算法的简化版本）
 */
function extractSkeleton(
  mask: boolean[][],
  width: number,
  height: number
): boolean[][] {
  // 创建工作副本
  let current: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    current.push([...mask[y]]);
  }

  let changed = true;
  let iterations = 0;
  const maxIterations = Math.min(width, height) / 2;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // 第一次子迭代
    const toRemove1: [number, number][] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (current[y][x] && canRemoveZhangSuen1(current, x, y)) {
          toRemove1.push([x, y]);
        }
      }
    }
    for (const [x, y] of toRemove1) {
      current[y][x] = false;
      changed = true;
    }

    // 第二次子迭代
    const toRemove2: [number, number][] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (current[y][x] && canRemoveZhangSuen2(current, x, y)) {
          toRemove2.push([x, y]);
        }
      }
    }
    for (const [x, y] of toRemove2) {
      current[y][x] = false;
      changed = true;
    }
  }

  return current;
}

/**
 * Zhang-Suen算法第一次子迭代的删除条件
 */
function canRemoveZhangSuen1(img: boolean[][], x: number, y: number): boolean {
  const p2 = img[y - 1][x] ? 1 : 0;
  const p3 = img[y - 1][x + 1] ? 1 : 0;
  const p4 = img[y][x + 1] ? 1 : 0;
  const p5 = img[y + 1][x + 1] ? 1 : 0;
  const p6 = img[y + 1][x] ? 1 : 0;
  const p7 = img[y + 1][x - 1] ? 1 : 0;
  const p8 = img[y][x - 1] ? 1 : 0;
  const p9 = img[y - 1][x - 1] ? 1 : 0;

  const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
  if (B < 2 || B > 6) return false;

  const A = countTransitions(p2, p3, p4, p5, p6, p7, p8, p9);
  if (A !== 1) return false;

  if (p2 * p4 * p6 !== 0) return false;
  if (p4 * p6 * p8 !== 0) return false;

  return true;
}

/**
 * Zhang-Suen算法第二次子迭代的删除条件
 */
function canRemoveZhangSuen2(img: boolean[][], x: number, y: number): boolean {
  const p2 = img[y - 1][x] ? 1 : 0;
  const p3 = img[y - 1][x + 1] ? 1 : 0;
  const p4 = img[y][x + 1] ? 1 : 0;
  const p5 = img[y + 1][x + 1] ? 1 : 0;
  const p6 = img[y + 1][x] ? 1 : 0;
  const p7 = img[y + 1][x - 1] ? 1 : 0;
  const p8 = img[y][x - 1] ? 1 : 0;
  const p9 = img[y - 1][x - 1] ? 1 : 0;

  const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
  if (B < 2 || B > 6) return false;

  const A = countTransitions(p2, p3, p4, p5, p6, p7, p8, p9);
  if (A !== 1) return false;

  if (p2 * p4 * p8 !== 0) return false;
  if (p2 * p6 * p8 !== 0) return false;

  return true;
}

/**
 * 计算0->1的过渡次数
 */
function countTransitions(
  p2: number, p3: number, p4: number, p5: number,
  p6: number, p7: number, p8: number, p9: number
): number {
  let count = 0;
  if (p2 === 0 && p3 === 1) count++;
  if (p3 === 0 && p4 === 1) count++;
  if (p4 === 0 && p5 === 1) count++;
  if (p5 === 0 && p6 === 1) count++;
  if (p6 === 0 && p7 === 1) count++;
  if (p7 === 0 && p8 === 1) count++;
  if (p8 === 0 && p9 === 1) count++;
  if (p9 === 0 && p2 === 1) count++;
  return count;
}

/**
 * 计算距离变换（欧氏距离近似）
 * 使用两遍扫描算法计算每个前景像素到最近背景像素的距离
 */
function computeDistanceTransform(
  foreground: boolean[][],
  width: number,
  height: number
): number[][] {
  const INF = width + height;
  const dist: number[][] = [];

  // 初始化：前景=INF，背景=0
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(foreground[y][x] ? INF : 0);
    }
    dist.push(row);
  }

  // 第一遍：从左上到右下
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (dist[y][x] === 0) continue;

      // 检查左边和上边的邻居
      if (x > 0 && dist[y][x - 1] + 1 < dist[y][x]) {
        dist[y][x] = dist[y][x - 1] + 1;
      }
      if (y > 0 && dist[y - 1][x] + 1 < dist[y][x]) {
        dist[y][x] = dist[y - 1][x] + 1;
      }
      // 对角线（增加更自然的圆形效果）
      if (x > 0 && y > 0 && dist[y - 1][x - 1] + 1.4 < dist[y][x]) {
        dist[y][x] = Math.floor(dist[y - 1][x - 1] + 1.4);
      }
    }
  }

  // 第二遍：从右下到左上
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      if (dist[y][x] === 0) continue;

      // 检查右边和下边的邻居
      if (x < width - 1 && dist[y][x + 1] + 1 < dist[y][x]) {
        dist[y][x] = dist[y][x + 1] + 1;
      }
      if (y < height - 1 && dist[y + 1][x] + 1 < dist[y][x]) {
        dist[y][x] = dist[y + 1][x] + 1;
      }
      // 对角线
      if (x < width - 1 && y < height - 1 && dist[y + 1][x + 1] + 1.4 < dist[y][x]) {
        dist[y][x] = Math.floor(dist[y + 1][x + 1] + 1.4);
      }
    }
  }

  return dist;
}

/**
 * 生成增强深度数据（结合距离变换 + 亮度信息）
 * 适用于更复杂的图案
 * @param imageDataUrl 图片的 base64 data URL
 * @param brightnessWeight 亮度权重 (0-1)，默认0.3
 * @returns 增强深度数据
 */
export async function generateEnhancedDepth(
  imageDataUrl: string,
  brightnessWeight: number = 0.3
): Promise<DepthData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建Canvas上下文'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const { width, height } = img;

      // 创建前景蒙版和亮度图
      const foregroundMask: boolean[][] = [];
      const brightnessMap: number[][] = [];

      for (let y = 0; y < height; y++) {
        const maskRow: boolean[] = [];
        const brightRow: number[] = [];
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          const r = imageData.data[index];
          const g = imageData.data[index + 1];
          const b = imageData.data[index + 2];
          const a = imageData.data[index + 3];

          maskRow.push(a >= 128);
          brightRow.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
        }
        foregroundMask.push(maskRow);
        brightnessMap.push(brightRow);
      }

      // 计算距离变换
      const distanceMap = computeDistanceTransform(foregroundMask, width, height);

      // 归一化距离
      let maxDist = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (distanceMap[y][x] > maxDist) maxDist = distanceMap[y][x];
        }
      }

      // 混合距离和亮度
      const distanceWeight = 1 - brightnessWeight;
      const pixels: number[][] = [];

      for (let y = 0; y < height; y++) {
        const row: number[] = [];
        for (let x = 0; x < width; x++) {
          if (!foregroundMask[y][x]) {
            row.push(0);
          } else {
            const normalizedDist = maxDist > 0
              ? (distanceMap[y][x] / maxDist) * 255
              : 128;
            const brightness = brightnessMap[y][x];
            const combined = Math.round(
              distanceWeight * normalizedDist + brightnessWeight * brightness
            );
            row.push(Math.min(255, Math.max(0, combined)));
          }
        }
        pixels.push(row);
      }

      resolve({
        width,
        height,
        pixels,
      });
    };

    img.onerror = () => {
      reject(new Error('加载图片失败'));
    };

    img.src = imageDataUrl;
  });
}
