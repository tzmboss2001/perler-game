/**
 * 我的色板服务 - 管理用户拥有的拼豆颜色
 * 默认存储到 localStorage；登录后支持云同步。
 */

import { mardColors, BeadColor } from '../data/beadColors';
import { getToken } from './api/authApi';
import { userApi } from './api/userApi';

const MY_COLORS_KEY = 'perler_beads_my_colors';

export interface MyColorsData {
  selectedIds: string[];
  updatedAt: string;
}

export interface ColorSeries {
  key: string;
  name: string;
  description: string;
  colors: BeadColor[];
}

export const getMardSeries = (): ColorSeries[] => {
  const seriesMap: Record<string, { name: string; description: string }> = {
    A: { name: 'A系列', description: '黄橙色系' },
    B: { name: 'B系列', description: '绿色系' },
    C: { name: 'C系列', description: '青蓝色系' },
    D: { name: 'D系列', description: '紫色系' },
    E: { name: 'E系列', description: '粉色系' },
    F: { name: 'F系列', description: '红色系' },
    G: { name: 'G系列', description: '棕色肤色系' },
    H: { name: 'H系列', description: '黑白灰色系' },
    M: { name: 'M系列', description: '莫兰迪色系' },
    P: { name: 'P系列', description: '粉彩系' },
    Q: { name: 'Q系列', description: '荧光色系' },
    R: { name: 'R系列', description: '新色系' },
    T: { name: 'T系列', description: '透明色' },
    Y: { name: 'Y系列', description: '夜光色' },
  };

  const grouped: Record<string, BeadColor[]> = {};
  mardColors.forEach(c => {
    const key = c.id.charAt(0).toUpperCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  return Object.entries(seriesMap)
    .filter(([key]) => grouped[key]?.length > 0)
    .map(([key, info]) => ({
      key,
      name: info.name,
      description: info.description,
      colors: grouped[key],
    }));
};

export const myColorsService = {
  getSelectedIds: (): string[] => {
    try {
      const data = localStorage.getItem(MY_COLORS_KEY);
      if (data) {
        const parsed: MyColorsData = JSON.parse(data);
        return parsed.selectedIds || [];
      }
    } catch (e) {
      console.error('[myColorsService] 读取失败:', e);
    }
    return [];
  },

  saveSelectedIds: (ids: string[]): void => {
    const data: MyColorsData = {
      selectedIds: ids,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(MY_COLORS_KEY, JSON.stringify(data));
  },

  hasCustomPalette: (): boolean => {
    const ids = myColorsService.getSelectedIds();
    return ids.length > 0;
  },

  getExcludeColorIds: (): string[] => {
    const selectedIds = new Set(myColorsService.getSelectedIds());
    if (selectedIds.size === 0) return [];
    return mardColors
      .filter(c => !selectedIds.has(c.id))
      .map(c => c.id);
  },

  clear: (): void => {
    localStorage.removeItem(MY_COLORS_KEY);
  },

  syncFromCloud: async (): Promise<string[]> => {
    const token = getToken();
    if (!token) return myColorsService.getSelectedIds();

    try {
      const res = await userApi.getPreferences();
      if (res.code === 0 && Array.isArray(res.data?.my_color_ids)) {
        myColorsService.saveSelectedIds(res.data.my_color_ids);
        return res.data.my_color_ids;
      }
    } catch (e) {
      console.warn('[myColorsService] 从云端同步失败:', e);
    }

    return myColorsService.getSelectedIds();
  },

  syncToCloud: async (ids: string[]): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;

    try {
      const res = await userApi.updatePreferences(ids);
      return res.code === 0;
    } catch (e) {
      console.warn('[myColorsService] 同步到云端失败:', e);
      return false;
    }
  },
};

export default myColorsService;
