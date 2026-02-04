/**
 * 项目/方案 API 服务
 */

import { getToken } from './authApi';

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

// 通用请求函数（带超时处理）
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
      throw new Error(`请求超时 (${timeout / 1000}秒)`);
    }
    throw error;
  }
}

// 项目 API
export const projectApi = {
  /**
   * 创建方案
   */
  create: async (data: CreateProjectReq): Promise<ApiResponse<{ id: number }>> => {
    const deviceId = getDeviceId();
    return request('/api/v1/project/create', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        device_id: deviceId,
      }),
    });
  },

  /**
   * 获取方案列表
   */
  getList: async (params: { page?: number; pageSize?: number; status?: number } = {}): Promise<ApiResponse<PageResult<ProjectInfo>>> => {
    const { page = 1, pageSize = 20, status } = params;
    let url = `/api/v1/project/list?page=${page}&pageSize=${pageSize}`;
    if (status !== undefined) {
      url += `&status=${status}`;
    }
    return request(url, { method: 'GET' });
  },

  /**
   * 获取方案详情
   */
  getById: async (id: number): Promise<ApiResponse<ProjectDetail>> => {
    return request(`/api/v1/project/${id}`, { method: 'GET' });
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
