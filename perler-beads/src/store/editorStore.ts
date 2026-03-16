/**
 * 编辑器状态管理
 * 使用 Zustand 管理编辑状态和历史记录
 */

import { create } from 'zustand';
import { BeadColor, getColorsByBrand } from '../data/beadColors';
import { BeadPixelData } from '../services/colorMatchService';

export type EditorTool = 'brush' | 'fill' | 'eraser' | 'picker';

type HistoryBead = BeadColor | null;

const cloneHistoryBeads = (beads: HistoryBead[]): HistoryBead[] =>
  beads.map((bead) => (bead ? { ...bead } : null));

interface EditorState {
  // 当前工具
  currentTool: EditorTool;
  setCurrentTool: (tool: EditorTool) => void;

  // 当前选中的颜色
  currentColor: BeadColor | null;
  setCurrentColor: (color: BeadColor) => void;

  // 珠子数据
  beadData: BeadPixelData | null;
  initializeBeadData: (data: BeadPixelData) => void;
  setBeadData: (data: BeadPixelData) => void;

  // 历史记录（用于撤销/重做）
  history: HistoryBead[][];
  historyIndex: number;
  maxHistory: number;

  // 保存当前状态到历史
  saveToHistory: () => void;

  // 撤销
  undo: () => void;

  // 重做
  redo: () => void;

  // 是否可以撤销/重做
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 修改单个珠子
  setBeadAt: (x: number, y: number, color: BeadColor) => void;

  // 填充区域
  floodFill: (x: number, y: number, newColor: BeadColor) => void;

  // 清空历史
  clearHistory: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentTool: 'brush',
  setCurrentTool: (tool) => set({ currentTool: tool }),

  currentColor: null,
  setCurrentColor: (color) => set({ currentColor: color }),

  beadData: null,
  initializeBeadData: (data) => {
    set({
      beadData: data,
      history: [cloneHistoryBeads(data.beads)],
      historyIndex: 0,
    });
  },
  setBeadData: (data) => {
    set({
      beadData: data,
    });
  },

  history: [],
  historyIndex: -1,
  maxHistory: 50,

  saveToHistory: () => {
    const { beadData, history, historyIndex, maxHistory } = get();
    if (!beadData) return;

    // 复制当前状态
    const currentState = cloneHistoryBeads(beadData.beads);

    // 截断后面的历史（如果在中间进行了新操作）
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);

    // 限制历史长度
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex, beadData } = get();
    if (historyIndex <= 0 || !beadData) return;

    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];

    set({
      beadData: {
        ...beadData,
        beads: cloneHistoryBeads(previousState),
      },
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const { history, historyIndex, beadData } = get();
    if (historyIndex >= history.length - 1 || !beadData) return;

    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];

    set({
      beadData: {
        ...beadData,
        beads: cloneHistoryBeads(nextState),
      },
      historyIndex: newIndex,
    });
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  setBeadAt: (x, y, color) => {
    const { beadData } = get();
    if (!beadData) return;

    const { width, height, beads } = beadData;
    if (x < 0 || x >= width || y < 0 || y >= height) return;

    const index = y * width + x;
    const newBeads = [...beads];
    newBeads[index] = color;

    set({
      beadData: {
        ...beadData,
        beads: newBeads,
      },
    });
  },

  floodFill: (startX, startY, newColor) => {
    const { beadData } = get();
    if (!beadData) return;

    const { width, height, beads } = beadData;
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const startIndex = startY * width + startX;
    const startColor = beads[startIndex];

    // 如果颜色相同，不需要填充
    if (startColor.id === newColor.id) return;

    const newBeads = [...beads];
    const visited = new Set<number>();
    const stack: [number, number][] = [[startX, startY]];

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const index = y * width + x;

      if (
        x < 0 || x >= width ||
        y < 0 || y >= height ||
        visited.has(index)
      ) {
        continue;
      }

      const currentColor = newBeads[index];
      if (currentColor.id !== startColor.id) {
        continue;
      }

      visited.add(index);
      newBeads[index] = newColor;

      // 添加相邻像素
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    set({
      beadData: {
        ...beadData,
        beads: newBeads,
      },
    });
  },

  clearHistory: () => {
    set({
      history: [],
      historyIndex: -1,
    });
  },
}));

export default useEditorStore;
