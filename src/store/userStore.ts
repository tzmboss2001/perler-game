import { create } from 'zustand';
import { authApi, getToken, setToken, clearToken } from '@/services/api';
import type { UserInfo } from '@/services/api';

interface UserState {
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  loading: boolean;

  // 初始化（恢复登录状态）
  initUser: () => Promise<void>;
  // 智能登录
  smartLogin: (email: string, password: string) => Promise<boolean>;
  // 退出登录
  logout: () => void;
  // 刷新用户信息
  refreshUserInfo: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  userInfo: null,
  isLoggedIn: false,
  loading: false,

  initUser: async () => {
    const token = getToken();
    if (!token) return;

    set({ loading: true });
    try {
      const info = await authApi.getUserInfo();
      set({ userInfo: info, isLoggedIn: true });
    } catch {
      clearToken();
      set({ userInfo: null, isLoggedIn: false });
    } finally {
      set({ loading: false });
    }
  },

  smartLogin: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const resp = await authApi.smartLogin(email, password);
      setToken(resp.token);
      set({ userInfo: resp.user_info, isLoggedIn: true });
      return resp.is_new_user;
    } catch (err) {
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    clearToken();
    set({ userInfo: null, isLoggedIn: false });
  },

  refreshUserInfo: async () => {
    try {
      const info = await authApi.getUserInfo();
      set({ userInfo: info });
    } catch {
      // 静默失败
    }
  },
}));
