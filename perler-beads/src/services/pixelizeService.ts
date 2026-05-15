/**
 * 像素化服务
 * 将图片转换为像素网格
 */

export interface PixelData {
  width: number;
  height: number;
  pixels: [number, number, number][];  // RGB 数组
  alphas?: number[];  // Alpha 通道数组（0-255），用于支持透明背景
}

export interface PixelizeOptions {
  gridWidth: number;      // 网格宽度（珠子数量）
  gridHeight?: number;    // 网格高度（可选，自动计算）
  keepAspectRatio?: boolean;  // 保持宽高比
}

/**
 * 将图片像素化
 * @param imageSource 图片来源（URL、File、HTMLImageElement）
 * @param options 像素化选项
 * @returns 像素数据
 */
export const pixelizeImage = async (
  imageSource: string | File | HTMLImageElement,
  options: PixelizeOptions
): Promise<PixelData> => {
  const image = await loadImage(imageSource);
  return pixelizeFromImage(image, options);
};

/**
 * 加载图片
 */
export const loadImage = (source: string | File | HTMLImageElement): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    if (source instanceof HTMLImageElement) {
      if (source.complete) {
        resolve(source);
      } else {
        source.onload = () => resolve(source);
        source.onerror = reject;
      }
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
};

/**
 * 从 HTMLImageElement 进行像素化
 */
export const pixelizeFromImage = (
  image: HTMLImageElement,
  options: PixelizeOptions
): PixelData => {
  const { gridWidth, gridHeight: targetHeight, keepAspectRatio = true } = options;

  // 只限制宽度范围（10-240），高度根据最终宽度按比例自动计算，不做限制
  // 这样可以正确处理各种比例的图片（横图、竖图、正方形）
  // 支持拼豆板规格：52钉小板、104钉大板、156/208钉拼接，以及编辑器最大 240 宽度
  // 注意：>100 可能会在低端设备上变慢，UI 有渐变色提示
  const minWidth = 10;
  const maxWidth = 240;
  const finalWidth = Math.max(minWidth, Math.min(gridWidth, maxWidth));
  const finalHeight = targetHeight && !keepAspectRatio
    ? targetHeight
    : Math.round(finalWidth * (image.height / image.width));

  // 创建离屏 Canvas
  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 设置图像平滑（像素化效果）
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';

  // 绘制缩放后的图片
  ctx.drawImage(image, 0, 0, finalWidth, finalHeight);

  // 获取像素数据
  const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
  const pixels: [number, number, number][] = [];
  const alphas: number[] = [];

  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    pixels.push([r, g, b]);
    alphas.push(a);
  }

  return {
    width: finalWidth,
    height: finalHeight,
    pixels,
    alphas,  // 包含 alpha 通道，用于透明背景处理
  };
};

/**
 * 从 Canvas 获取像素数据
 */
export const getPixelsFromCanvas = (canvas: HTMLCanvasElement): PixelData => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels: [number, number, number][] = [];

  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels.push([
      imageData.data[i],
      imageData.data[i + 1],
      imageData.data[i + 2],
    ]);
  }

  return {
    width: canvas.width,
    height: canvas.height,
    pixels,
  };
};

/**
 * 将像素数据渲染到 Canvas
 */
export const renderPixelsToCanvas = (
  pixelData: PixelData,
  canvas: HTMLCanvasElement,
  cellSize: number = 10,
  showGrid: boolean = true
): void => {
  const { width, height, pixels } = pixelData;
  const canvasWidth = width * cellSize;
  const canvasHeight = height * cellSize;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // 绘制每个像素格子
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const [r, g, b] = pixels[index];

      // 绘制色块
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
    }
  }

  // 绘制网格线
  if (showGrid) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;

    // 垂直线
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvasHeight);
      ctx.stroke();
    }

    // 水平线
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvasWidth, y * cellSize);
      ctx.stroke();
    }
  }
};

/**
 * 将像素数据导出为图片
 */
export const exportToImage = (
  pixelData: PixelData,
  cellSize: number = 20,
  showGrid: boolean = true,
  format: 'png' | 'jpeg' = 'png'
): string => {
  const canvas = document.createElement('canvas');
  renderPixelsToCanvas(pixelData, canvas, cellSize, showGrid);
  return canvas.toDataURL(`image/${format}`);
};

/**
 * 获取指定位置的像素颜色
 */
export const getPixelAt = (
  pixelData: PixelData,
  x: number,
  y: number
): [number, number, number] | null => {
  const { width, height, pixels } = pixelData;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    return null;
  }

  const index = y * width + x;
  return pixels[index];
};

/**
 * 设置指定位置的像素颜色
 */
export const setPixelAt = (
  pixelData: PixelData,
  x: number,
  y: number,
  color: [number, number, number]
): void => {
  const { width, height, pixels } = pixelData;

  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  const index = y * width + x;
  pixels[index] = color;
};

/**
 * 填充区域（油漆桶工具）
 */
export const floodFill = (
  pixelData: PixelData,
  startX: number,
  startY: number,
  newColor: [number, number, number],
  tolerance: number = 0
): void => {
  const { width, height, pixels } = pixelData;
  const startIndex = startY * width + startX;
  const startColor = [...pixels[startIndex]] as [number, number, number];

  // 如果起始颜色和新颜色相同，直接返回
  if (
    startColor[0] === newColor[0] &&
    startColor[1] === newColor[1] &&
    startColor[2] === newColor[2]
  ) {
    return;
  }

  const visited = new Set<number>();
  const stack: [number, number][] = [[startX, startY]];

  const colorsMatch = (c1: [number, number, number], c2: [number, number, number]): boolean => {
    if (tolerance === 0) {
      return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2];
    }
    const distance = Math.sqrt(
      Math.pow(c1[0] - c2[0], 2) +
      Math.pow(c1[1] - c2[1], 2) +
      Math.pow(c1[2] - c2[2], 2)
    );
    return distance <= tolerance;
  };

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const index = y * width + x;

    if (
      x < 0 || x >= width ||
      y < 0 || y >= height ||
      visited.has(index)
    ) {
      continue;
    }

    const currentColor = pixels[index];
    if (!colorsMatch(currentColor, startColor)) {
      continue;
    }

    visited.add(index);
    pixels[index] = newColor;

    // 添加相邻像素
    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }
};

export default {
  pixelizeImage,
  loadImage,
  pixelizeFromImage,
  getPixelsFromCanvas,
  renderPixelsToCanvas,
  exportToImage,
  getPixelAt,
  setPixelAt,
  floodFill,
};
