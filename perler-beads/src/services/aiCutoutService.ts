import { getToken } from './api/authApi';

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

type AiCutoutEnabledMode = 'off' | 'mock' | 'live';

export interface AiCutoutProviderPlan {
  provider: 'aliyun';
  scene: 'complex-background';
  recommendedEntry: 'rewarded-ad' | 'direct';
  endpointConfigured: boolean;
  endpointUrl: string;
  enabledMode: AiCutoutEnabledMode;
}

export interface AiCutoutAvailability {
  available: boolean;
  title: string;
  description: string;
  nextStep: string;
  providerLabel: string;
  recommendedEntryLabel: string;
}

export interface AiCutoutRequestPayload {
  imageData: string;
  mode: 'foreground-segmentation';
}

export interface AiCutoutResult {
  imageData: string;
  provider: 'aliyun';
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8012';
const AI_CUTOUT_API_URL =
  import.meta.env.VITE_AI_CUTOUT_API_URL || `${API_BASE_URL}/api/v1/ai/cutout`;

const AI_CUTOUT_MEMORY_CACHE_LIMIT = 8;
const aiCutoutMemoryCache = new Map<string, AiCutoutResult>();

const readEnabledMode = (): AiCutoutEnabledMode => {
  const raw = String(import.meta.env.VITE_AI_CUTOUT_ENABLED || '').trim().toLowerCase();
  if (raw === 'true' || raw === 'live') return 'live';
  if (raw === 'mock') return 'mock';
  return 'off';
};

const loadImage = (imageData: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('智能抠图读取原图失败'));
    image.src = imageData;
  });

const colorDistance = (
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const fastHash = (input: string): string => {
  let hashA = 5381;
  let hashB = 52711;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    hashA = ((hashA << 5) + hashA) ^ code;
    hashB = ((hashB << 5) + hashB) ^ (code + i);
  }
  return `${(hashA >>> 0).toString(16)}${(hashB >>> 0).toString(16)}`;
};

const buildCacheKey = (payload: AiCutoutRequestPayload): string =>
  `${payload.mode}:${fastHash(payload.imageData)}`;

const readFromMemoryCache = (cacheKey: string): AiCutoutResult | null => {
  const cached = aiCutoutMemoryCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  // Refresh insertion order for a simple LRU effect.
  aiCutoutMemoryCache.delete(cacheKey);
  aiCutoutMemoryCache.set(cacheKey, cached);
  return cached;
};

const writeToMemoryCache = (cacheKey: string, result: AiCutoutResult): void => {
  if (aiCutoutMemoryCache.has(cacheKey)) {
    aiCutoutMemoryCache.delete(cacheKey);
  }
  aiCutoutMemoryCache.set(cacheKey, result);

  while (aiCutoutMemoryCache.size > AI_CUTOUT_MEMORY_CACHE_LIMIT) {
    const oldestKey = aiCutoutMemoryCache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    aiCutoutMemoryCache.delete(oldestKey);
  }
};

const buildMockCutout = async (imageData: string): Promise<string> => {
  const image = await loadImage(imageData);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('智能抠图无法创建画布');
  }

  context.drawImage(image, 0, 0);
  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = frame;

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let borderCount = 0;

  const sampleBorderPixel = (x: number, y: number) => {
    const offset = (y * width + x) * 4;
    if (data[offset + 3] < 16) return;
    sumR += data[offset];
    sumG += data[offset + 1];
    sumB += data[offset + 2];
    borderCount += 1;
  };

  for (let x = 0; x < width; x += 1) {
    sampleBorderPixel(x, 0);
    sampleBorderPixel(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    sampleBorderPixel(0, y);
    sampleBorderPixel(width - 1, y);
  }

  if (borderCount === 0) {
    return imageData;
  }

  const avgR = sumR / borderCount;
  const avgG = sumG / borderCount;
  const avgB = sumB / borderCount;
  const threshold = 48;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const pushPixel = (x: number, y: number) => {
    const index = y * width + x;
    if (visited[index]) return;
    visited[index] = 1;
    queue.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    pushPixel(x, 0);
    pushPixel(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    pushPixel(0, y);
    pushPixel(width - 1, y);
  }

  while (queue.length > 0) {
    const index = queue.shift() as number;
    const x = index % width;
    const y = Math.floor(index / width);
    const offset = index * 4;
    const alpha = data[offset + 3];

    if (alpha < 16) {
      data[offset + 3] = 0;
    } else {
      const distance = colorDistance(
        data[offset],
        data[offset + 1],
        data[offset + 2],
        avgR,
        avgG,
        avgB
      );
      if (distance > threshold) {
        continue;
      }
      data[offset + 3] = 0;
    }

    if (x > 0) pushPixel(x - 1, y);
    if (x < width - 1) pushPixel(x + 1, y);
    if (y > 0) pushPixel(x, y - 1);
    if (y < height - 1) pushPixel(x, y + 1);
  }

  context.putImageData(frame, 0, 0);
  return canvas.toDataURL('image/png');
};

export const getAiCutoutProviderPlan = (): AiCutoutProviderPlan => {
  const enabledMode = readEnabledMode();
  return {
    provider: 'aliyun',
    scene: 'complex-background',
    recommendedEntry: 'rewarded-ad',
    endpointConfigured: enabledMode !== 'off',
    endpointUrl: AI_CUTOUT_API_URL,
    enabledMode,
  };
};

export const getAiCutoutAvailability = (): AiCutoutAvailability => {
  const plan = getAiCutoutProviderPlan();

  if (plan.enabledMode === 'mock') {
    return {
      available: true,
      title: '智能抠图模拟模式',
      description: '当前已接通本地模拟抠图链路，可用于验证弹窗、结果回灌和重新生成流程。',
      nextStep: '后续只要把 mock 模式切换成服务端真实接口，就能接入正式智能抠图能力。',
      providerLabel: '阿里云智能抠图（模拟）',
      recommendedEntryLabel: '本地直接验证',
    };
  }

  if (plan.enabledMode === 'live') {
    return {
      available: plan.endpointConfigured,
      title: '智能抠图已就绪',
      description: '当前会走服务端智能抠图接口，适合复杂背景的人像、宠物和写实图片。',
      nextStep: '如果后端已经配置供应商密钥，就可以直接处理复杂背景图片。',
      providerLabel: '阿里云智能抠图',
      recommendedEntryLabel: '复杂图按次解锁',
    };
  }

  return {
    available: false,
    title: '智能抠图准备中',
    description: '当前版本已预留智能抠图入口，但还没有启用服务端处理能力。',
    nextStep: '只要启用服务端 AI 抠图接口并填入供应商密钥，这个入口就能切成正式能力。',
    providerLabel: '阿里云智能抠图',
    recommendedEntryLabel: '复杂图按次解锁',
  };
};

export const requestAiCutout = async (
  payload: AiCutoutRequestPayload
): Promise<AiCutoutResult> => {
  const cacheKey = buildCacheKey(payload);
  const cached = readFromMemoryCache(cacheKey);
  if (cached) {
    return cached;
  }

  const plan = getAiCutoutProviderPlan();

  if (plan.enabledMode === 'mock') {
    const result = {
      imageData: await buildMockCutout(payload.imageData),
      provider: 'aliyun' as const,
    };
    writeToMemoryCache(cacheKey, result);
    return result;
  }

  if (!plan.endpointConfigured) {
    throw new Error('智能抠图服务暂未接入');
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    (headers as Record<string, string>)['x-token'] = token;
  }

  const response = await fetch(plan.endpointUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `智能抠图请求失败（${response.status}）`);
  }

  const result = (await response.json()) as ApiResponse<AiCutoutResult>;
  if (result.code !== 0 || !result.data?.imageData) {
    throw new Error(result.msg || '智能抠图返回结果无效');
  }

  writeToMemoryCache(cacheKey, result.data);
  return result.data;
};
