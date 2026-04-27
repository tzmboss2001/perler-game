import { clearToken, getToken } from './authApi';
import { handleAuthExpiredApiResponse } from './authExpiry';

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface UserPreferencesResp {
  my_color_ids: string[];
}

export interface UserPublicProfileResp {
  id: number;
  nickname: string;
  avatar: string;
  bio: string;
  community_post_count: number;
  finished_work_count: number;
  total_like_count: number;
  total_make_count: number;
  joined_at: string;
}

async function request<T>(url: string, options: RequestInit = {}, timeout = 30000): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['x-token'] = token;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, headers, signal: options.signal || controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    handleAuthExpiredApiResponse(result, clearToken);
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络后重试');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const userApi = {
  getPublicProfile: async (userId: number): Promise<ApiResponse<UserPublicProfileResp>> => {
    return request<UserPublicProfileResp>(`/api/v1/user/public/${userId}`, { method: 'GET' });
  },

  getPreferences: async (): Promise<ApiResponse<UserPreferencesResp>> => {
    return request<UserPreferencesResp>('/api/v1/user/preferences', { method: 'GET' });
  },

  updatePreferences: async (myColorIds: string[]): Promise<ApiResponse<null>> => {
    return request<null>('/api/v1/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ my_color_ids: myColorIds }),
    });
  },
};

export default userApi;
