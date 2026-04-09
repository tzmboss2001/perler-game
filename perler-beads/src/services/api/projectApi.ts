/**
 * 项目/方案 API 服务
 */

import { getToken } from './authApi';
import { allBeadColors, BeadColor } from '../../data/beadColors';

// 设备ID存储键
const DEVICE_ID_KEY = 'perler_beads_device_id';

// 获取或生成设备ID
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// API 响应类型
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

const compactProjectBeadDataEncoding = 'bead-id-grid-v1';

interface CompactProjectBeadData {
  encoding: typeof compactProjectBeadDataEncoding;
  width: number;
  height: number;
  beads: Array<string | null>;
}

// 分页结果
interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 创建方案请求
export interface CreateProjectReq {
  name: string;
  device_id?: string;
  thumbnail_url?: string;
  original_image: string;
  bead_data: {
    width: number;
    height: number;
    beads: Array<{
      id: string;
      name: string;
      nameCN: string;
      rgb: [number, number, number];
      hex: string;
      brand: string;
    }>;
  };
  settings: {
    gridSize: number;
    gridHeight?: number;
    colorCount: number;
    saturationBoost: number;
    vibrancyPreference: number;
  };
}

// 更新进度请求
export interface UpdateProgressReq {
  progress: {
    // 选中状态
    selectionType: 'block' | 'color' | null;
    blockX: number;
    blockY: number;
    colorHex?: string;
    colorId?: string;
    // 时间戳
    timestamp: number;
  };
}

// 方案信息（列表用）
export interface ProjectInfo {
  id: number;
  name: string;
  thumbnail_url: string;
  settings: {
    gridSize: number;
    gridHeight?: number;
    colorCount: number;
    saturationBoost: number;
    vibrancyPreference: number;
  };
  progress: {
    selectionType: 'block' | 'color' | null;
    blockX: number;
    blockY: number;
    colorHex?: string;
    colorId?: string;
    timestamp: number;
  } | null;
  status: number;
  created_at: string;
  updated_at: string;
}

// 方案详情
export interface ProjectDetail extends ProjectInfo {
  original_image: string;
  bead_data: {
    width: number;
    height: number;
    beads: Array<{
      id: string;
      name: string;
      nameCN: string;
      rgb: [number, number, number];
      hex: string;
      brand: string;
    }>;
  };
}

const beadColorById = new Map<string, BeadColor>(allBeadColors.map((color) => [color.id, color]));

// 通用请求函数（带超时处理，支持外部取消信号）
async function request<T>(url: string, options: RequestInit = {}, timeout = 120000): Promise<ApiResponse<T>> {
  const deviceId = getDeviceId();
  const token = getToken();

  // 添加设备ID到URL或body
  if (options.method === 'GET' || options.method === 'DELETE') {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}device_id=${deviceId}`;
  }

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // 如果外部传入了 signal，监听其 abort 事件以联动取消
  const externalSignal = options.signal;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new Error('请求已被取消');
    }
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  // 构建 headers，如果有 token 则添加
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['x-token'] = token;
  }

  try {
    console.log(`[API] 请求开始: ${url}`);
    const startTime = Date.now();

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);
    console.log(`[API] 请求完成: ${url}, 耗时: ${Date.now() - startTime}ms`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      // 区分外部取消和超时
      if (externalSignal?.aborted) {
        throw error; // 保持 AbortError 让调用方识别
      }
      throw new Error(`请求超时 (${timeout / 1000}秒)`);
    }
    throw error;
  }
}

function compactBeadDataForCloudSave(beadData: CreateProjectReq['bead_data']): CompactProjectBeadData {
  return {
    encoding: compactProjectBeadDataEncoding,
    width: beadData.width,
    height: beadData.height,
    beads: beadData.beads.map((bead) => bead?.id ?? null),
  };
}

function expandProjectBeadData(
  beadData: ProjectDetail['bead_data'] | CompactProjectBeadData
): ProjectDetail['bead_data'] {
  if ((beadData as CompactProjectBeadData).encoding !== compactProjectBeadDataEncoding) {
    return beadData as ProjectDetail['bead_data'];
  }

  const compact = beadData as CompactProjectBeadData;
  return {
    width: compact.width,
    height: compact.height,
    beads: compact.beads.map((id) => {
      if (!id) {
        return null as unknown as ProjectDetail['bead_data']['beads'][number];
      }

      const matched = beadColorById.get(id);
      if (!matched) {
        return {
          id,
          name: id,
          nameCN: id,
          rgb: [0, 0, 0] as [number, number, number],
          hex: '#000000',
          brand: 'artkal',
        };
      }

      return {
        id: matched.id,
        name: matched.name,
        nameCN: matched.nameCN,
        rgb: matched.rgb,
        hex: matched.hex,
        brand: matched.brand,
      };
    }),
  };
}

// 项目 API
export const projectApi = {
  /**
   * 创建方案
   */
  create: async (data: CreateProjectReq, signal?: AbortSignal): Promise<ApiResponse<{ id: number }>> => {
    const deviceId = getDeviceId();
    const compactBeadData = compactBeadDataForCloudSave(data.bead_data);
    return request('/api/v1/project/create', {
      method: 'POST',
      signal,
      body: JSON.stringify({
        ...data,
        bead_data: compactBeadData,
        device_id: deviceId,
      }),
    });
  },

  /**
   * 获取方案列表
   */
  getList: async (params: { page?: number; pageSize?: number; status?: number; signal?: AbortSignal } = {}): Promise<ApiResponse<PageResult<ProjectInfo>>> => {
    const { page = 1, pageSize = 20, status, signal } = params;
    let url = `/api/v1/project/list?page=${page}&pageSize=${pageSize}`;
    if (status !== undefined) {
      url += `&status=${status}`;
    }
    return request(url, { method: 'GET', signal });
  },

  /**
   * 获取方案详情
   */
  getById: async (id: number): Promise<ApiResponse<ProjectDetail>> => {
    const response = await request<ProjectDetail>(`/api/v1/project/${id}`, { method: 'GET' });
    if (response?.data?.bead_data) {
      response.data.bead_data = expandProjectBeadData(
        response.data.bead_data as ProjectDetail['bead_data'] | CompactProjectBeadData
      );
    }
    return response;
  },

  /**
   * 更新方案
   */
  update: async (id: number, data: Partial<CreateProjectReq>): Promise<ApiResponse<null>> => {
    return request(`/api/v1/project/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 更新制作进度
   */
  updateProgress: async (id: number, data: UpdateProgressReq): Promise<ApiResponse<null>> => {
    const deviceId = getDeviceId();
    return request(`/api/v1/project/${id}/progress?device_id=${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * 删除方案
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    return request(`/api/v1/project/${id}`, { method: 'DELETE' });
  },
};

export default projectApi;
