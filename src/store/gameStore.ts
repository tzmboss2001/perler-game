import { create } from 'zustand';
import { BeadBoard, beadKey } from '@/core/BeadBoard';
import type { Bead, GamePhase, IroningResult, Template, TapingResult, FlipState, RemovalState, PaperState, StepRecord } from '@/types/game';

// 绘制工具类型
export type DrawTool = 'pen' | 'eraser';

interface GameState {
  // 游戏阶段
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;

  // 画布
  board: BeadBoard;
  setBoardSize: (width: number, height: number) => void;

  // 拼豆操作
  placeBead: (x: number, y: number, color: string, colorId: string) => void;
  removeBead: (x: number, y: number) => void;
  clearBeads: () => void;

  // 当前选中颜色
  selectedColor: string;
  selectedColorId: string;
  setSelectedColor: (color: string, colorId: string) => void;

  // 绘制工具
  drawTool: DrawTool;
  setDrawTool: (tool: DrawTool) => void;

  // 熨烫结果
  ironingResult: IroningResult | null;
  setIroningResult: (result: IroningResult | null) => void;

  // 结果页用的拼豆快照（带失败效果）
  resultBeads: Bead[];
  resultBoardWidth: number;
  resultBoardHeight: number;
  setResultSnapshot: (beads: Bead[], width: number, height: number) => void;

  // 撤销/重做
  undoStack: Map<string, Bead>[];
  redoStack: Map<string, Bead>[];
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  pushUndoState: () => void;

  // 模板相关
  selectedTemplate: Template | null;
  showGuide: boolean;
  setTemplate: (template: Template | null) => void;
  toggleGuide: () => void;

  // 贴美纹纸结果
  tapingResult: TapingResult | null;
  setTapingResult: (result: TapingResult | null) => void;

  // 存活的豆子（翻转/去钉板后）
  survivingBeads: Map<string, Bead> | null;
  setSurvivingBeads: (beads: Map<string, Bead> | null) => void;

  // 掉落的豆子 key 列表
  droppedBeads: string[];
  setDroppedBeads: (keys: string[]) => void;

  // 烘焙纸覆盖率
  paperCoverage: number;
  setPaperCoverage: (coverage: number) => void;

  // 翻转状态
  flipState: FlipState | null;
  setFlipState: (state: FlipState | null) => void;

  // 去钉板状态
  removalState: RemovalState | null;
  setRemovalState: (state: RemovalState | null) => void;

  // 烘焙纸状态
  paperState: PaperState | null;
  setPaperState: (state: PaperState | null) => void;

  // 过程记录（用于结果页回顾）
  stepRecords: StepRecord[];
  addStepRecord: (record: StepRecord) => void;

  // 抢救
  rescueUsed: boolean;
  setRescueUsed: (used: boolean) => void;

  // 音效
  soundEnabled: boolean;
  toggleSound: () => void;

  // 触发重绘（Canvas 需要）
  renderVersion: number;
  triggerRender: () => void;

  // 重置游戏
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'selecting',
  setPhase: (phase) => set({ phase }),

  board: new BeadBoard(20, 20),
  setBoardSize: (width, height) => {
    set({ board: new BeadBoard(width, height) });
  },

  placeBead: (x, y, color, colorId) => {
    const { board } = get();
    if (!board.isInBounds(x, y)) return;
    // 如果已有同色拼豆，不重复记录
    const existing = board.getBead(x, y);
    if (existing && existing.color === color) return;

    get().pushUndoState();
    board.beads.set(beadKey(x, y), { x, y, color, colorId, state: 'raw' });
    set({ redoStack: [] });
    get().triggerRender();
  },

  removeBead: (x, y) => {
    const { board } = get();
    if (!board.getBead(x, y)) return;
    get().pushUndoState();
    board.beads.delete(beadKey(x, y));
    set({ redoStack: [] });
    get().triggerRender();
  },

  clearBeads: () => {
    const { board } = get();
    if (board.count === 0) return;
    get().pushUndoState();
    board.clear();
    set({ redoStack: [] });
    get().triggerRender();
  },

  selectedColor: '#e7ce3e',
  selectedColorId: '80-19003',
  setSelectedColor: (color, colorId) => set({ selectedColor: color, selectedColorId: colorId }),

  drawTool: 'pen',
  setDrawTool: (tool) => set({ drawTool: tool }),

  ironingResult: null,
  setIroningResult: (result) => set({ ironingResult: result }),

  resultBeads: [],
  resultBoardWidth: 15,
  resultBoardHeight: 15,
  setResultSnapshot: (beads, width, height) => set({
    resultBeads: beads,
    resultBoardWidth: width,
    resultBoardHeight: height,
  }),

  undoStack: [],
  redoStack: [],
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  pushUndoState: () => {
    const { board, undoStack } = get();
    const snapshot = board.cloneBeads();
    set({ undoStack: [...undoStack.slice(-29), snapshot] });
  },
  undo: () => {
    const { undoStack, board, redoStack } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    // 保存当前状态到redo
    redoStack.push(board.cloneBeads());
    board.restoreBeads(prev);
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack],
    });
    get().triggerRender();
  },
  redo: () => {
    const { redoStack, board, undoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    undoStack.push(board.cloneBeads());
    board.restoreBeads(next);
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack],
    });
    get().triggerRender();
  },

  selectedTemplate: null,
  showGuide: true,
  setTemplate: (template) => set({ selectedTemplate: template, showGuide: template !== null }),
  toggleGuide: () => set((s) => ({ showGuide: !s.showGuide })),

  // 新增阶段状态
  tapingResult: null,
  setTapingResult: (result) => set({ tapingResult: result }),

  survivingBeads: null,
  setSurvivingBeads: (beads) => set({ survivingBeads: beads }),

  droppedBeads: [],
  setDroppedBeads: (keys) => set({ droppedBeads: keys }),

  paperCoverage: 0,
  setPaperCoverage: (coverage) => set({ paperCoverage: coverage }),

  flipState: null,
  setFlipState: (state) => set({ flipState: state }),

  removalState: null,
  setRemovalState: (state) => set({ removalState: state }),

  paperState: null,
  setPaperState: (state) => set({ paperState: state }),

  stepRecords: [],
  addStepRecord: (record) => set((s) => ({ stepRecords: [...s.stepRecords, record] })),

  rescueUsed: false,
  setRescueUsed: (used) => set({ rescueUsed: used }),

  soundEnabled: true,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  renderVersion: 0,
  triggerRender: () => set((s) => ({ renderVersion: s.renderVersion + 1 })),

  resetGame: () => set({
    phase: 'selecting',
    board: new BeadBoard(20, 20),
    ironingResult: null,
    resultBeads: [],
    resultBoardWidth: 15,
    resultBoardHeight: 15,
    undoStack: [],
    redoStack: [],
    renderVersion: 0,
    selectedTemplate: null,
    showGuide: true,
    rescueUsed: false,
    // 新增阶段状态重置
    tapingResult: null,
    survivingBeads: null,
    droppedBeads: [],
    paperCoverage: 0,
    flipState: null,
    removalState: null,
    paperState: null,
    stepRecords: [],
  }),
}));
