/**
 * 认证 API 服务
 */

// Token 存储键
import { isAuthExpiredApiResponse } from './authExpiry';

const TOKEN_KEY = 'perler_beads_token';
const USER_INFO_KEY = 'perler_beads_user_info';
export const AUTH_CLEARED_EVENT = 'perler-auth-cleared';

// API 响应类型
interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// 用户信息
export interface UserInfo {
  id: number;
  email: string;
  username: string;
  nickname: string;
  avatar: string;
  email_verified: boolean;
  member_level: number;
  member_expire: string;
}

// 登录响应
export interface LoginResp {
  token: string;
  user_info: UserInfo;
}

// 注册响应
export interface RegisterResp {
  user_id: number;
}

// 注册请求
export interface RegisterReq {
  email: string;
  password: string;
  username: string;
  nickname?: string;
}

// 登录请求
export interface LoginReq {
  email: string;
  password: string;
}

// 智能登录请求（与普通登录相同）
export interface SmartLoginReq {
  email: string;
  password: string;
}

// 智能登录响应
export interface SmartLoginResp {
  token: string;
  user_info: UserInfo;
  is_new_user: boolean;
}

// 修改密码请求
export interface ChangePasswordReq {
  old_password: string;
  new_password: string;
}

/**
 * 获取本地存储的 Token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 设置 Token 到本地存储
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function emitAuthClearedEvent(): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  if (typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent(AUTH_CLEARED_EVENT));
    return;
  }
  if (typeof document !== 'undefined' && typeof document.createEvent === 'function') {
    const event = document.createEvent('Event');
    event.initEvent(AUTH_CLEARED_EVENT, false, false);
    window.dispatchEvent(event);
  }
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  emitAuthClearedEvent();
}

/**
 * 获取本地存储的用户信息
 */
export function getLocalUserInfo(): UserInfo | null {
  const userInfoStr = localStorage.getItem(USER_INFO_KEY);
  if (userInfoStr) {
    try {
      return JSON.parse(userInfoStr);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 设置用户信息到本地存储
 */
export function setLocalUserInfo(userInfo: UserInfo): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * 通用请求函数（带 Token）
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
    // 根据状态码返回人性化错误提示
    const errorMessages: Record<number, string> = {
      400: '请求信息有误，请检查后重试',
      401: '登录已过期，请重新登录',
      403: '没有权限执行此操作',
      404: '服务暂时不可用，请稍后重试',
      500: '服务器开小差了，请稍后重试',
      502: '网络连接异常，请检查网络',
      503: '服务正在维护中，请稍后重试',
    };
    throw new Error(errorMessages[response.status] || '网络请求失败，请稍后重试');
  }

  const result = await response.json();

  // 如果返回未授权状态，清除本地登录状态
  if (isAuthExpiredApiResponse(result)) {
    clearToken();
  }

  return result;
}

// 认证 API
export const authApi = {
  /**
   * 用户注册
   */
  register: async (data: RegisterReq): Promise<ApiResponse<RegisterResp>> => {
    return request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 用户登录
   */
  login: async (data: LoginReq): Promise<ApiResponse<LoginResp>> => {
    const result = await request<LoginResp>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // 登录成功后保存 Token 和用户信息
    if (result.code === 0 && result.data) {
      setToken(result.data.token);
      setLocalUserInfo(result.data.user_info);
    }

    return result;
  },

  /**
   * 智能登录（邮箱不存在时自动注册）
   */
  smartLogin: async (data: SmartLoginReq): Promise<ApiResponse<SmartLoginResp>> => {
    const result = await request<SmartLoginResp>('/api/v1/auth/smart-login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // 登录成功后保存 Token 和用户信息
    if (result.code === 0 && result.data) {
      setToken(result.data.token);
      setLocalUserInfo(result.data.user_info);
    }

    return result;
  },

  /**
   * 获取当前用户信息
   */
  getUserInfo: async (): Promise<ApiResponse<UserInfo>> => {
    const result = await request<UserInfo>('/api/v1/auth/user-info', {
      method: 'GET',
    });

    // 更新本地用户信息
    if (result.code === 0 && result.data) {
      setLocalUserInfo(result.data);
    }

    return result;
  },

  /**
   * 修改密码
   */
  changePassword: async (data: ChangePasswordReq): Promise<ApiResponse<null>> => {
    return request('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 登出（仅清除本地状态）
   */
  logout: (): void => {
    clearToken();
  },

  /**
   * 注销账号
   * 删除用户所有数据，不可恢复
   */
  deleteAccount: async (): Promise<ApiResponse<null>> => {
    const result = await request<null>('/api/v1/auth/delete-account', {
      method: 'DELETE',
    });

    // 注销成功后清除本地状态
    if (result.code === 0) {
      clearToken();
    }

    return result;
  },
};

export default authApi;
