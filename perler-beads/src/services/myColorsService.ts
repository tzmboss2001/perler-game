/**
 * 我的色板服务 - 管理用户拥有的拼豆颜色
 * 数据存储在 localStorage
 */

import { mardColors, BeadColor } from '../data/beadColors';

// localStorage 键
const MY_COLORS_KEY = 'perler_beads_my_colors';

// 存储数据结构
export interface MyColorsData {
  selectedIds: string[];
  updatedAt: string;
}

// MARD 系列分组定义
export interface ColorSeries {
  key: string;
  name: string;
  description: string;
  colors: BeadColor[];
}

// 获取 MARD 系列分组
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

// 我的色板服务
export const myColorsService = {
  /** 获取已选的颜色ID列表 */
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

  /** 保存选中的颜色ID列表 */
  saveSelectedIds: (ids: string[]): void => {
    const data: MyColorsData = {
      selectedIds: ids,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(MY_COLORS_KEY, JSON.stringify(data));
  },

  /** 是否已配置过自定义色板 */
  hasCustomPalette: (): boolean => {
    const ids = myColorsService.getSelectedIds();
    return ids.length > 0;
  },

  /** 获取不在自定义列表中的颜色ID（用于 excludeColors） */
  getExcludeColorIds: (): string[] => {
    const selectedIds = new Set(myColorsService.getSelectedIds());
    if (selectedIds.size === 0) return [];
    return mardColors
      .filter(c => !selectedIds.has(c.id))
      .map(c => c.id);
  },

  /** 清除自定义色板 */
  clear: (): void => {
    localStorage.removeItem(MY_COLORS_KEY);
  },
};

export default myColorsService;
