import { getToken } from './authApi';

interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface UserPreferencesResp {
  my_color_ids: string[];
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
    return response.json();
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
