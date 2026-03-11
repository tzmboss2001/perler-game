const QUICK_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const HD_OPTIMIZE_MAX_DIMENSION = 2560;
const HD_OPTIMIZE_MAX_PIXELS = 2560 * 2560;
const HD_OPTIMIZE_QUALITY_STEPS = [0.9, 0.84, 0.78, 0.72, 0.66];

export interface ImageOptimizationResult {
  optimizedDataUrl: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
  optimized: boolean;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解码失败'));
    img.src = url;
  });
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  const padding = (base64.match(/=*$/)?.[0].length || 0);
  return Math.floor(base64.length * 0.75) - padding;
}

function pickTargetSize(width: number, height: number) {
  const longSideScale = Math.min(1, HD_OPTIMIZE_MAX_DIMENSION / Math.max(width, height));
  const pixelScale = Math.min(1, Math.sqrt(HD_OPTIMIZE_MAX_PIXELS / (width * height)));
  const scale = Math.min(longSideScale, pixelScale);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function drawOptimizedCanvas(img: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建图片处理画布');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export async function prepareImageForCreation(file: File): Promise<ImageOptimizationResult> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  if (file.size <= QUICK_UPLOAD_MAX_BYTES) {
    return {
      optimizedDataUrl: rawDataUrl,
      originalSizeBytes: file.size,
      optimizedSizeBytes: file.size,
      originalWidth: img.width,
      originalHeight: img.height,
      optimizedWidth: img.width,
      optimizedHeight: img.height,
      optimized: false,
    };
  }

  const target = pickTargetSize(img.width, img.height);
  const canvas = drawOptimizedCanvas(img, target.width, target.height);

  let bestDataUrl = canvas.toDataURL('image/jpeg', HD_OPTIMIZE_QUALITY_STEPS[0]);
  for (const quality of HD_OPTIMIZE_QUALITY_STEPS) {
    const attempt = canvas.toDataURL('image/jpeg', quality);
    bestDataUrl = attempt;
    if (dataUrlBytes(attempt) <= QUICK_UPLOAD_MAX_BYTES) {
      break;
    }
  }

  return {
    optimizedDataUrl: bestDataUrl,
    originalSizeBytes: file.size,
    optimizedSizeBytes: dataUrlBytes(bestDataUrl),
    originalWidth: img.width,
    originalHeight: img.height,
    optimizedWidth: target.width,
    optimizedHeight: target.height,
    optimized: true,
  };
}

export const imageOptimizationConfig = {
  quickUploadMaxBytes: QUICK_UPLOAD_MAX_BYTES,
  hdOptimizeMaxDimension: HD_OPTIMIZE_MAX_DIMENSION,
};
