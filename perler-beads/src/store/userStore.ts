/**
 * 用户状态管理
 * 使用 Zustand 管理用户登录状态
 */

import { create } from 'zustand';
import {
  authApi,
  UserInfo,
  getToken,
  getLocalUserInfo,
  LoginReq,
  RegisterReq,
  SmartLoginReq,
} from '../services/api/authApi';
import { myColorsService } from '../services/myColorsService';

interface UserState {
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;

  initUser: () => void;
  login: (data: LoginReq) => Promise<boolean>;
  smartLogin: (data: SmartLoginReq) => Promise<{ success: boolean; isNewUser: boolean }>;
  register: (data: RegisterReq) => Promise<{ success: boolean; userId?: number }>;
  logout: () => void;
  deleteAccount: () => Promise<{ success: boolean; message: string }>;
  refreshUserInfo: () => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  userInfo: null,
  isLoggedIn: false,
  loading: false,
  error: null,

  initUser: () => {
    const token = getToken();
    const localUserInfo = getLocalUserInfo();

    if (token && localUserInfo) {
      set({
        isLoggedIn: true,
        userInfo: localUserInfo,
      });

      myColorsService.syncFromCloud().catch((err) => {
        console.warn('[userStore] myColors sync failed:', err);
      });
    }
  },

  login: async (data: LoginReq) => {
    set({ loading: true, error: null });

    try {
      const result = await authApi.login(data);

      if (result.code === 0 && result.data) {
        set({
          isLoggedIn: true,
          userInfo: result.data.user_info,
          loading: false,
        });

        myColorsService.syncFromCloud().catch((err) => {
          console.warn('[userStore] myColors sync failed:', err);
        });
        return true;
      }

      set({
        error: result.msg || '登录失败',
        loading: false,
      });
      return false;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '登录失败，请稍后重试',
        loading: false,
      });
      return false;
    }
  },

  smartLogin: async (data: SmartLoginReq) => {
    set({ loading: true, error: null });

    try {
      const result = await authApi.smartLogin(data);

      if (result.code === 0 && result.data) {
        set({
          isLoggedIn: true,
          userInfo: result.data.user_info,
          loading: false,
        });

        myColorsService.syncFromCloud().catch((err) => {
          console.warn('[userStore] myColors sync failed:', err);
        });
        return { success: true, isNewUser: result.data.is_new_user };
      }

      set({
        error: result.msg || '登录失败',
        loading: false,
      });
      return { success: false, isNewUser: false };
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '登录失败，请稍后重试',
        loading: false,
      });
      return { success: false, isNewUser: false };
    }
  },

  register: async (data: RegisterReq) => {
    set({ loading: true, error: null });

    try {
      const result = await authApi.register(data);

      if (result.code === 0 && result.data) {
        set({ loading: false });
        return { success: true, userId: result.data.user_id };
      }

      set({
        error: result.msg || '注册失败',
        loading: false,
      });
      return { success: false };
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '注册失败，请稍后重试',
        loading: false,
      });
      return { success: false };
    }
  },

  logout: () => {
    authApi.logout();
    set({
      isLoggedIn: false,
      userInfo: null,
      error: null,
    });
  },

  deleteAccount: async () => {
    set({ loading: true, error: null });

    try {
      const result = await authApi.deleteAccount();

      if (result.code === 0) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('making_state_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        set({
          isLoggedIn: false,
          userInfo: null,
          loading: false,
          error: null,
        });
        return { success: true, message: '账号已注销' };
      }

      set({
        error: result.msg || '注销失败',
        loading: false,
      });
      return { success: false, message: result.msg || '注销失败，请稍后重试' };
    } catch (err) {
      const message = err instanceof Error ? err.message : '注销失败，请稍后重试';
      set({
        error: message,
        loading: false,
      });
      return { success: false, message };
    }
  },

  refreshUserInfo: async () => {
    const { isLoggedIn } = get();
    if (!isLoggedIn) return;

    try {
      const result = await authApi.getUserInfo();
      if (result.code === 0 && result.data) {
        set({ userInfo: result.data });
      }
    } catch (err) {
      console.error('刷新用户信息失败:', err);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useUserStore;
