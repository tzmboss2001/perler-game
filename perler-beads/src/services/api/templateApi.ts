/**
 * 模板 API 服务
 */

import { clearToken, getToken } from './authApi';
import { handleAuthExpiredApiResponse } from './authExpiry';

// API 响应类型
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// 分类响应
export interface CategoryResponse {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
  template_count: number;
}

// 模板响应
export interface TemplateResponse {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  thumbnail_url: string;
  bead_data: Record<string, unknown>;
  grid_width: number;
  grid_height: number;
  bead_count: number;
  color_count: number;
  difficulty: string;
  is_featured: boolean;
  use_count: number;
  created_at: string;
}

// 精选模板响应（API返回驼峰格式）
export interface FeaturedTemplateResponse {
  id: number;
  title: string;        // API返回title而非name
  imageUrl: string;     // API返回imageUrl
  beadCount: number;    // API返回beadCount
  gridSize: string;     // API返回gridSize（如"64x64"）
  difficulty: string;
  isOfficial: boolean;  // API返回isOfficial
  category: string;     // API返回category而非category_name
}

// 分页结果
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 模板列表请求参数
export interface TemplateListParams {
  page?: number;
  pageSize?: number;
  category_id?: number;
  is_featured?: boolean;
  difficulty?: string;
  keyword?: string;
}

/**
 * 通用请求函数
 */
async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['x-token'] = token;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  const result = await response.json();
  handleAuthExpiredApiResponse(result, clearToken);
  return result;
}

// 模板 API
export const templateApi = {
  /**
   * 获取模板分类列表
   */
  getCategories: async (): Promise<ApiResponse<CategoryResponse[]>> => {
    return request('/api/v1/template/categories', {
      method: 'GET',
    });
  },

  /**
   * 获取模板列表
   */
  getList: async (params: TemplateListParams = {}): Promise<ApiResponse<PageResult<TemplateResponse>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params.category_id) searchParams.set('category_id', params.category_id.toString());
    if (params.is_featured !== undefined) searchParams.set('is_featured', params.is_featured.toString());
    if (params.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params.keyword) searchParams.set('keyword', params.keyword);

    const url = `/api/v1/template/list?${searchParams.toString()}`;
    return request(url, { method: 'GET' });
  },

  /**
   * 获取精选模板（首页用）
   */
  getFeatured: async (limit: number = 5): Promise<ApiResponse<FeaturedTemplateResponse[]>> => {
    return request(`/api/v1/template/featured?limit=${limit}`, {
      method: 'GET',
    });
  },

  /**
   * 获取模板详情
   */
  getById: async (id: number): Promise<ApiResponse<TemplateResponse>> => {
    return request(`/api/v1/template/${id}`, {
      method: 'GET',
    });
  },

  /**
   * 使用模板（需要登录）
   */
  useTemplate: async (id: number): Promise<ApiResponse<TemplateResponse>> => {
    return request(`/api/v1/template/${id}/use`, {
      method: 'POST',
    });
  },
};

export default templateApi;
