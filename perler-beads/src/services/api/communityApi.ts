/**
 * 社区 API 服务
 */

import { getToken } from './authApi';

// API 响应类型
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// 作者信息
export interface CommunityPostAuthor {
  id: number;
  nickname: string;
  avatar: string;
}

// 社区作品列表项（不含 bead_data）
export interface CommunityPostListItem {
  id: number;
  title: string;
  thumbnail_url: string;
  grid_width: number;
  grid_height: number;
  color_count: number;
  difficulty: string;
  like_count: number;
  view_count: number;
  make_count: number;
  user: CommunityPostAuthor;
  created_at: string;
}

// 社区作品详情（含 bead_data）
export interface CommunityPostDetail {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  image_urls: string[];
  bead_data: Record<string, unknown>;
  grid_width: number;
  grid_height: number;
  bead_count: number;
  color_count: number;
  difficulty: string;
  like_count: number;
  view_count: number;
  make_count: number;
  user: CommunityPostAuthor;
  created_at: string;
}

// 分页结果
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 列表请求参数
export interface CommunityListParams {
  page?: number;
  pageSize?: number;
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

  return response.json();
}

// 社区 API
export const communityApi = {
  /**
   * 获取社区作品列表
   */
  getPosts: async (params: CommunityListParams = {}): Promise<ApiResponse<PageResult<CommunityPostListItem>>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    const url = `/api/v1/community/posts?${searchParams.toString()}`;
    return request(url, { method: 'GET' });
  },

  /**
   * 获取作品详情
   */
  getPostById: async (id: number): Promise<ApiResponse<CommunityPostDetail>> => {
    return request(`/api/v1/community/posts/${id}`, { method: 'GET' });
  },

  /**
   * 增加制作次数
   */
  incrementMakeCount: async (id: number): Promise<void> => {
    try {
      await request(`/api/v1/community/posts/${id}/make`, { method: 'POST' });
    } catch {
      // 静默失败，不阻塞用户操作
    }
  },
};

export default communityApi;
