import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, CheckCircle, Eye, EyeSlash, Gear, Lightning, LightningSlash, X, DownloadSimple, Swap, SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { BeadPixelData } from '../../services/colorMatchService';
import { BeadColor, allBeadColors } from '../../data/beadColors';
// projectApi 不再需要，进度只保存在本地
import { useToast } from '../../components/Toast';
import ExportModal from '../../components/ExportModal';
import ColorReplaceModal from '../../components/ColorReplaceModal';
import CoordinateTooltip from '../../components/CoordinateTooltip';
import { getContrastColor, speakCoordinate, canSpeak } from '../../utils/colorUtils';
import BottomNav from '../../components/BottomNav';
import { recommendBoard } from '../../services/boardService';

// Wake Lock API 类型声明
declare global {
  interface Navigator {
    wakeLock?: {
      request: (type: 'screen') => Promise<WakeLockSentinel>;
    };
  }
  interface WakeLockSentinel {
    release: () => Promise<void>;
    addEventListener: (type: 'release', listener: () => void) => void;
  }
}

// 选中状态类型
interface SelectionState {
  type: 'block' | 'color' | null;
  blockX: number;
  blockY: number;
  colorHex?: string;
  colorId?: string;
}

// 缩放阈值：大于此值时点击选颜色，否则选区块
const ZOOM_THRESHOLD = 2.5;

// 区块大小（固定为10x10，匹配实际拼豆板的大网格）
const BLOCK_SIZE = 10;

/**
 * 制作辅助页面 - 优化版
 * 解决4个痛点：找珠子、放珠子、跟踪进度、色号缺货
 */
const MakingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 拖动和缩放相关状态
  const [isDragging, setIsDragging] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapProcessedRef = useRef<number>(0); // 防止 touch+click 双重触发

  // 从编辑器或方案列表传来的数据
  interface LocationState {
    beadData: BeadPixelData;
    colorCount?: number;
    projectId?: number;
    savedProgress?: {
      selectionType: 'block' | 'color' | null;
      blockX: number;
      blockY: number;
      colorHex?: string;
      colorId?: string;
      timestamp: number;
    };
  }
  const { beadData: initialBeadData, projectId, savedProgress } = (location.state as LocationState) || {};

  // 测试模式：如果没有数据，生成测试数据（仅开发环境）
  const getTestData = (): BeadPixelData | null => {
    if (initialBeadData) return initialBeadData;
    const params = new URLSearchParams(location.search);
    if (params.get('test') !== '1') return null;

    // 使用真实的 allBeadColors ID
    const testColors: BeadColor[] = [
      { id: '80-19001', name: 'White', hex: '#eaefee', brand: 'perler' },
      { id: '80-19002', name: 'Creme', hex: '#e1e2bb', brand: 'perler' },
      { id: '80-19005', name: 'Red', hex: '#b0353c', brand: 'perler' },
      { id: '80-19008', name: 'Dark Blue', hex: '#0e5092', brand: 'perler' },
      { id: '80-19010', name: 'Dark Green', hex: '#007b4e', brand: 'perler' },
      { id: '80-19003', name: 'Yellow', hex: '#e7ce3e', brand: 'perler' },
      { id: '80-19004', name: 'Orange', hex: '#eb7b31', brand: 'perler' },
      { id: '80-19007', name: 'Purple', hex: '#684b86', brand: 'perler' },
    ];
    const beads: BeadColor[] = [];
    for (let i = 0; i < 900; i++) {
      beads.push(testColors[i % testColors.length]);
    }
    return { width: 30, height: 30, beads };
  };

  const [beadData, setBeadData] = useState<BeadPixelData | null>(getTestData());

  // 选中状态（核心状态）
  const [selection, setSelection] = useState<SelectionState>({
    type: null,
    blockX: 0,
    blockY: 0,
  });

  // UI 状态
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [showColorId, setShowColorId] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(canSpeak());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // 坐标提示框状态
  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    row: number;
    col: number;
    screenX: number;
    screenY: number;
  }>({
    visible: false,
    row: 0,
    col: 0,
    screenX: 0,
    screenY: 0,
  });

  // 基础 cellSize
  const baseCellSize = 10;

  // 监听视口高度变化（处理移动端地址栏显示/隐藏）
  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', updateHeight);
    updateHeight();
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // 计算区块数量
  const blocksX = beadData ? Math.ceil(beadData.width / BLOCK_SIZE) : 0;
  const blocksY = beadData ? Math.ceil(beadData.height / BLOCK_SIZE) : 0;

  // 获取指定区块内的某颜色的所有格子索引
  const getColorIndicesInBlock = useCallback((colorHex: string, blockX: number, blockY: number): number[] => {
    if (!beadData) return [];

    const indices: number[] = [];
    const startX = blockX * BLOCK_SIZE;
    const startY = blockY * BLOCK_SIZE;
    const endX = Math.min(startX + BLOCK_SIZE, beadData.width);
    const endY = Math.min(startY + BLOCK_SIZE, beadData.height);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const index = y * beadData.width + x;
        const bead = beadData.beads[index];
        if (bead && bead.hex === colorHex) {
          indices.push(index);
        }
      }
    }
    return indices;
  }, [beadData]);

  // 获取选中颜色在当前区块的数量
  const colorCountInBlock = useMemo(() => {
    if (selection.type !== 'color' || !selection.colorHex) return 0;
    return getColorIndicesInBlock(selection.colorHex, selection.blockX, selection.blockY).length;
  }, [selection, getColorIndicesInBlock]);

  // 获取选中颜色在整个作品的数量
  const colorCountTotal = useMemo(() => {
    if (!beadData || !selection.colorHex) return 0;
    return beadData.beads.filter(b => b.hex === selection.colorHex).length;
  }, [beadData, selection.colorHex]);

  // 获取选中的 BeadColor 对象
  const selectedBeadColor = useMemo((): BeadColor | null => {
    if (!selection.colorId) return null;
    return allBeadColors.find(c => c.id === selection.colorId) || null;
  }, [selection.colorId]);

  // 计算合适的缩放（仅首次加载时执行，颜色替换等不重置）
  const initialScaleSetRef = useRef(false);
  useEffect(() => {
    if (beadData && !initialScaleSetRef.current) {
      initialScaleSetRef.current = true;
      const timer = setTimeout(() => {
        const viewportHeight = window.innerHeight;
        const availableHeight = viewportHeight - 40 - 64 - 50 - 60 - 24;
        const baseHeight = beadData.height * baseCellSize;
        const fitScale = availableHeight / baseHeight;
        setScale(Math.min(6, Math.max(1, fitScale)));
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [beadData]);

  // 适应屏幕：重置缩放和位移
  const handleFitScreen = useCallback(() => {
    if (!beadData) return;
    const vh = window.innerHeight;
    const availableHeight = vh - 40 - 64 - 50 - 60 - 24;
    const baseHeight = beadData.height * baseCellSize;
    const fitScale = availableHeight / baseHeight;
    setScale(Math.min(6, Math.max(1, fitScale)));
    setTranslateX(0);
    setTranslateY(0);
  }, [beadData]);

  // ===== 状态保存与恢复 =====
  const getStorageKey = useCallback(() => {
    if (projectId) return `making_state_${projectId}`;
    if (beadData) return `making_state_temp_${beadData.width}x${beadData.height}`;
    return null;
  }, [projectId, beadData]);

  // 保存选中状态到本地（自动调用，无网络请求）
  const saveSelectionStateToLocal = useCallback(() => {
    const key = getStorageKey();
    if (!key || selection.type === null) return;

    const stateToSave = {
      type: selection.type,
      blockX: selection.blockX,
      blockY: selection.blockY,
      colorHex: selection.colorHex,
      colorId: selection.colorId,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(stateToSave));
      console.log('[MakingPage] 进度已保存到本地');
    } catch (e) {
      console.error('保存本地状态失败:', e);
    }
  }, [getStorageKey, selection]);

  // 恢复选中状态（优先云端，其次本地）
  useEffect(() => {
    if (!beadData) return;

    // 优先使用从云端传入的进度
    if (savedProgress && savedProgress.selectionType) {
      if (savedProgress.blockX < blocksX && savedProgress.blockY < blocksY) {
        setSelection({
          type: savedProgress.selectionType,
          blockX: savedProgress.blockX,
          blockY: savedProgress.blockY,
          colorHex: savedProgress.colorHex,
          colorId: savedProgress.colorId,
        });
        console.log('[MakingPage] 已从云端恢复进度');
        return;
      }
    }

    // 其次尝试从本地恢复
    const key = getStorageKey();
    if (!key) return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const state = JSON.parse(saved);
        // 验证数据有效性
        if (state.blockX < blocksX && state.blockY < blocksY) {
          setSelection({
            type: state.type,
            blockX: state.blockX,
            blockY: state.blockY,
            colorHex: state.colorHex,
            colorId: state.colorId,
          });
          console.log('[MakingPage] 已从本地恢复进度');
        }
      }
    } catch (e) {
      console.error('恢复状态失败:', e);
    }
  }, [getStorageKey, beadData, blocksX, blocksY, savedProgress]);

  // 页面切后台/关闭/卸载时保存到本地
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveSelectionStateToLocal();
      }
    };

    const handlePageHide = () => {
      saveSelectionStateToLocal();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      // 组件卸载时也保存（比如点击返回键）
      saveSelectionStateToLocal();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveSelectionStateToLocal]);

  // 切换选中状态时自动保存到本地
  useEffect(() => {
    if (selection.type !== null) {
      saveSelectionStateToLocal();
    }
  }, [selection, saveSelectionStateToLocal]);

  // ===== 屏幕常亮功能 =====
  const toggleWakeLock = useCallback(async () => {
    if (wakeLockActive && wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        toast.info('屏幕常亮已关闭');
      } catch (err) {
        console.error('释放 Wake Lock 失败:', err);
      }
    } else {
      if ('wakeLock' in navigator && navigator.wakeLock) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          setWakeLockActive(true);
          toast.success('屏幕常亮已开启');
          wakeLockRef.current.addEventListener('release', () => {
            setWakeLockActive(false);
          });
        } catch (err) {
          console.error('请求 Wake Lock 失败:', err);
        }
      } else {
        toast.info('您的浏览器不支持屏幕常亮功能');
      }
    }
  }, [wakeLockActive, toast]);

  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // ===== 点击处理 - 智能交互核心 =====
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!beadData || !canvasRef.current || !wrapperRef.current) return;

    // 防止触摸事件的 click 二次触发（touchEnd 已处理过）
    if (Date.now() - lastTapProcessedRef.current < 500) return;

    // 拖拽检测：用 dragStartPosRef 判断是否为拖动
    const startPos = dragStartPosRef.current;
    dragStartPosRef.current = null; // 用完即清
    if (!startPos) return; // 没有 mousedown 记录，跳过

    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 10) return; // 是拖动，不处理点击

    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const rect = canvas.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // 计算点击的格子坐标
    const drawCellSize = baseCellSize * scale;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const cellX = Math.floor(clickX / drawCellSize);
    const cellY = Math.floor(clickY / drawCellSize);

    // 边界检查
    if (cellX < 0 || cellX >= beadData.width || cellY < 0 || cellY >= beadData.height) {
      return;
    }

    // 计算所在区块
    const blockX = Math.floor(cellX / BLOCK_SIZE);
    const blockY = Math.floor(cellY / BLOCK_SIZE);

    // 根据缩放级别决定行为
    if (scale < ZOOM_THRESHOLD) {
      // 缩小状态：选中区块
      if (selection.type === 'block' && selection.blockX === blockX && selection.blockY === blockY) {
        setSelection({ type: null, blockX: 0, blockY: 0 });
      } else {
        setSelection({
          type: 'block',
          blockX,
          blockY,
        });
        toast.info(`选中区块 (${blockX + 1}, ${blockY + 1})`);
      }
    } else {
      // 放大状态：选中颜色
      const index = cellY * beadData.width + cellX;
      const bead = beadData.beads[index];

      // 显示坐标提示
      const screenX = e.clientX - wrapperRect.left;
      const screenY = e.clientY - wrapperRect.top;

      setTooltipState({
        visible: true,
        row: cellY + 1,
        col: cellX + 1,
        screenX,
        screenY,
      });

      if (voiceEnabled) {
        speakCoordinate(cellY + 1, cellX + 1);
      }

      // 点击同一颜色 → 取消选中（不限区块）
      if (selection.type === 'color' && selection.colorHex === bead.hex) {
        setSelection({ type: null, blockX: 0, blockY: 0 });
      } else {
        setSelection({
          type: 'color',
          blockX,
          blockY,
          colorHex: bead.hex,
          colorId: bead.id,
        });
      }
    }
  }, [beadData, scale, selection, voiceEnabled, toast]);

  // 触摸拖动处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      dragStartTimeRef.current = Date.now();
      dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;

      setTranslateX(prev => prev + deltaX);
      setTranslateY(prev => prev + deltaY);

      lastTouchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else if (e.touches.length === 2 && lastPinchDistRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const scaleDelta = dist / lastPinchDistRef.current;
      const newScale = Math.min(6, Math.max(0.5, scale * scaleDelta));

      setScale(newScale);
      lastPinchDistRef.current = dist;
    }
  }, [isDragging, scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // 检查是否为点击（非拖动）
    if (e.changedTouches.length === 1 && dragStartPosRef.current) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - dragStartPosRef.current.x;
      const dy = touch.clientY - dragStartPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - dragStartTimeRef.current;

      if (distance < 10 && duration < 300 && canvasRef.current) {
        // 模拟点击事件
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const wrapper = wrapperRef.current;
        if (!wrapper || !beadData) {
          setIsDragging(false);
          lastTouchRef.current = null;
          lastPinchDistRef.current = null;
          dragStartPosRef.current = null;
          return;
        }

        const wrapperRect = wrapper.getBoundingClientRect();
        const drawCellSize = baseCellSize * scale;
        const clickX = touch.clientX - rect.left;
        const clickY = touch.clientY - rect.top;
        const cellX = Math.floor(clickX / drawCellSize);
        const cellY = Math.floor(clickY / drawCellSize);

        if (cellX >= 0 && cellX < beadData.width && cellY >= 0 && cellY < beadData.height) {
          const blockX = Math.floor(cellX / BLOCK_SIZE);
          const blockY = Math.floor(cellY / BLOCK_SIZE);

          if (scale < ZOOM_THRESHOLD) {
            if (selection.type === 'block' && selection.blockX === blockX && selection.blockY === blockY) {
              setSelection({ type: null, blockX: 0, blockY: 0 });
            } else {
              setSelection({ type: 'block', blockX, blockY });
              toast.info(`选中区块 (${blockX + 1}, ${blockY + 1})`);
            }
          } else {
            const index = cellY * beadData.width + cellX;
            const bead = beadData.beads[index];

            const screenX = touch.clientX - wrapperRect.left;
            const screenY = touch.clientY - wrapperRect.top;

            setTooltipState({
              visible: true,
              row: cellY + 1,
              col: cellX + 1,
              screenX,
              screenY,
            });

            if (voiceEnabled) {
              speakCoordinate(cellY + 1, cellX + 1);
            }

            // 点击同一颜色 → 取消选中（不限区块）
            if (selection.type === 'color' && selection.colorHex === bead.hex) {
              setSelection({ type: null, blockX: 0, blockY: 0 });
            } else {
              setSelection({
                type: 'color',
                blockX,
                blockY,
                colorHex: bead.hex,
                colorId: bead.id,
              });
            }
          }
        }

        // 标记已处理，防止后续 click 事件重复触发
        lastTapProcessedRef.current = Date.now();
      }
    }

    setIsDragging(false);
    lastTouchRef.current = null;
    lastPinchDistRef.current = null;
    dragStartPosRef.current = null;
  }, [beadData, scale, selection, voiceEnabled, toast]);

  // 鼠标拖动处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastTouchRef.current = { x: e.clientX, y: e.clientY };
    dragStartTimeRef.current = Date.now();
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    // 注意：不调用 preventDefault()，否则会阻止 click 事件
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !lastTouchRef.current) return;

    const deltaX = e.clientX - lastTouchRef.current.x;
    const deltaY = e.clientY - lastTouchRef.current.y;

    setTranslateX(prev => prev + deltaX);
    setTranslateY(prev => prev + deltaY);

    lastTouchRef.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    lastTouchRef.current = null;
    // 注意：不清除 dragStartPosRef，留给 handleCanvasClick 做拖拽距离判断
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    lastTouchRef.current = null;
    dragStartPosRef.current = null;
  }, []);

  // 鼠标滚轮缩放
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setScale(prev => Math.min(6, Math.max(0.5, prev + delta)));
    };

    wrapper.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => wrapper.removeEventListener('wheel', handleWheelNative);
  }, []);

  // 阻止页面滚动
  useEffect(() => {
    const container = document.querySelector('[data-making-page]');
    if (!container) return;

    const preventScroll = (e: Event) => {
      if (e.target === container || container.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    document.addEventListener('wheel', preventScroll, { passive: false });
    return () => document.removeEventListener('wheel', preventScroll);
  }, []);

  // ===== 颜色替换功能 =====
  const handleColorReplace = useCallback((newColor: BeadColor) => {
    if (!beadData || !selection.colorHex) return;

    // 替换所有该颜色的珠子
    const newBeads = beadData.beads.map(bead => {
      if (bead.hex === selection.colorHex) {
        return { ...newColor };
      }
      return bead;
    });

    setBeadData({
      ...beadData,
      beads: newBeads,
    });

    // 更新选中状态为新颜色
    setSelection({
      ...selection,
      colorHex: newColor.hex,
      colorId: newColor.id,
    });

    toast.success(`已将 ${colorCountTotal} 颗珠子替换为 ${newColor.name}`);
  }, [beadData, selection, colorCountTotal, toast]);

  // ===== 渲染 Canvas =====
  useEffect(() => {
    if (!beadData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height, beads } = beadData;
    const drawCellSize = baseCellSize * scale;
    const canvasWidth = width * drawCellSize;
    const canvasHeight = height * drawCellSize;

    // 高清渲染
    const maxCanvasSize = 4096;
    let dpr = window.devicePixelRatio || 1;
    const maxDimension = Math.max(canvasWidth, canvasHeight);
    if (maxDimension * dpr > maxCanvasSize) {
      dpr = Math.max(1, maxCanvasSize / maxDimension);
    }

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
    ctx.scale(dpr, dpr);

    // 获取选中区块的范围
    const selectedBlockStartX = selection.blockX * BLOCK_SIZE;
    const selectedBlockStartY = selection.blockY * BLOCK_SIZE;
    const selectedBlockEndX = Math.min(selectedBlockStartX + BLOCK_SIZE, width);
    const selectedBlockEndY = Math.min(selectedBlockStartY + BLOCK_SIZE, height);

    // 获取选中颜色的索引集合
    const highlightedIndices = new Set(
      selection.type === 'color' && selection.colorHex
        ? getColorIndicesInBlock(selection.colorHex, selection.blockX, selection.blockY)
        : []
    );

    // 绘制所有珠子
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const bead = beads[index];
        const px = x * drawCellSize;
        const py = y * drawCellSize;

        // 绘制背景色
        ctx.fillStyle = bead.hex;
        ctx.fillRect(px, py, drawCellSize, drawCellSize);

        // 选中区块时，非选中区域半透明
        if (selection.type === 'block') {
          const inBlock = x >= selectedBlockStartX && x < selectedBlockEndX &&
                          y >= selectedBlockStartY && y < selectedBlockEndY;
          if (!inBlock) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(px, py, drawCellSize, drawCellSize);
          }
        }

        // 选中颜色时
        if (selection.type === 'color') {
          if (!highlightedIndices.has(index)) {
            // 非高亮区域半透明
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(px, py, drawCellSize, drawCellSize);
          } else {
            // 高亮像素：加一层淡白提亮，自然发光
            ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.fillRect(px, py, drawCellSize, drawCellSize);
          }
        }
      }
    }

    // 绘制网格线
    const gridLineWidth = Math.max(1, scale * 0.3);

    // 白色底线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = gridLineWidth + 1;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * drawCellSize, 0);
      ctx.lineTo(x * drawCellSize, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * drawCellSize);
      ctx.lineTo(canvasWidth, y * drawCellSize);
      ctx.stroke();
    }

    // 深色线
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = gridLineWidth;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * drawCellSize, 0);
      ctx.lineTo(x * drawCellSize, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * drawCellSize);
      ctx.lineTo(canvasWidth, y * drawCellSize);
      ctx.stroke();
    }

    // 5×5 中等网格线（蓝色）
    ctx.strokeStyle = 'rgba(0, 100, 200, 0.6)';
    ctx.lineWidth = Math.max(1, scale * 0.6);
    for (let x = 0; x <= width; x++) {
      if (x % 5 === 0 && x % BLOCK_SIZE !== 0) {
        ctx.beginPath();
        ctx.moveTo(x * drawCellSize, 0);
        ctx.lineTo(x * drawCellSize, canvasHeight);
        ctx.stroke();
      }
    }
    for (let y = 0; y <= height; y++) {
      if (y % 5 === 0 && y % BLOCK_SIZE !== 0) {
        ctx.beginPath();
        ctx.moveTo(0, y * drawCellSize);
        ctx.lineTo(canvasWidth, y * drawCellSize);
        ctx.stroke();
      }
    }

    // 10×10 大网格线（黑色，原样式）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = Math.max(2, scale);
    for (let x = 0; x <= width; x += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x * drawCellSize, 0);
      ctx.lineTo(x * drawCellSize, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y * drawCellSize);
      ctx.lineTo(canvasWidth, y * drawCellSize);
      ctx.stroke();
    }

    // 拼豆板边界线（智能推荐板子尺寸 + 橙色虚线 + 板号标注）
    const boardRec = recommendBoard(width, height);
    const BOARD_SIZE = boardRec.boardSize;
    const boardCols = boardRec.cols;
    const boardRows = boardRec.rows;
    if (boardCols > 1 || boardRows > 1) {
      ctx.save();
      ctx.setLineDash([drawCellSize * 0.5, drawCellSize * 0.3]);
      ctx.strokeStyle = 'rgba(255, 160, 0, 0.8)';
      ctx.lineWidth = Math.max(2, scale * 1.2);
      // 垂直板线
      for (let c = 1; c < boardCols; c++) {
        const px = c * BOARD_SIZE * drawCellSize;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvasHeight);
        ctx.stroke();
      }
      // 水平板线
      for (let r = 1; r < boardRows; r++) {
        const py = r * BOARD_SIZE * drawCellSize;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvasWidth, py);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 板号标注
      const labelSize = Math.max(10, drawCellSize * 0.8);
      ctx.font = `bold ${labelSize}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      let boardNum = 1;
      for (let r = 0; r < boardRows; r++) {
        for (let c = 0; c < boardCols; c++) {
          const lx = c * BOARD_SIZE * drawCellSize + 3;
          const ly = r * BOARD_SIZE * drawCellSize + 3;
          // 背景
          const text = `板${boardNum}`;
          const tw = ctx.measureText(text).width + 6;
          ctx.fillStyle = 'rgba(255, 160, 0, 0.85)';
          ctx.fillRect(lx - 2, ly - 1, tw, labelSize + 4);
          // 文字
          ctx.fillStyle = '#fff';
          ctx.fillText(text, lx + 1, ly + 1);
          boardNum++;
        }
      }
      ctx.restore();
    }

    // 选中区块时，绘制高亮边框
    if (selection.type === 'block') {
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = Math.max(5, scale * 2);
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 4;
      const bw = (selectedBlockEndX - selectedBlockStartX) * drawCellSize;
      const bh = (selectedBlockEndY - selectedBlockStartY) * drawCellSize;
      ctx.strokeRect(
        selectedBlockStartX * drawCellSize,
        selectedBlockStartY * drawCellSize,
        bw,
        bh
      );
      ctx.shadowBlur = 0;
    }

    // 选中颜色时，高亮像素的提亮已在珠子绘制阶段完成（白色半透明叠加）
    // 不再使用粗边框，靠明暗对比自然突出选中像素

    // 绘制色号
    const minSizeForColorId = 24;
    const fullOpacitySize = 40;

    if (showColorId && drawCellSize >= minSizeForColorId) {
      const fontSize = Math.max(10, Math.min(28, drawCellSize * 0.42));
      const opacity = Math.min(1, (drawCellSize - minSizeForColorId) / (fullOpacitySize - minSizeForColorId));

      ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let y = 0; y < height; y++) {
        let currentColorId = '';
        let segmentCount = 0;

        for (let x = 0; x < width; x++) {
          const index = y * width + x;
          const bead = beads[index];
          const px = x * drawCellSize + drawCellSize / 2;
          const py = y * drawCellSize + drawCellSize / 2;

          // 判断该像素是否处于"活跃"状态（未被遮罩变暗）
          let isActive = true;
          if (selection.type === 'block') {
            const inBlock = x >= selectedBlockStartX && x < selectedBlockEndX &&
                            y >= selectedBlockStartY && y < selectedBlockEndY;
            isActive = inBlock;
          }
          if (selection.type === 'color') {
            isActive = highlightedIndices.has(index);
          }

          // 活跃像素正常显示，非活跃像素降低透明度（仍可见色号）
          const effectiveOpacity = isActive ? opacity : opacity * 0.35;

          const contrastColor = getContrastColor(bead.hex);
          const r = parseInt(contrastColor.slice(1, 3), 16);
          const g = parseInt(contrastColor.slice(3, 5), 16);
          const b = parseInt(contrastColor.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${effectiveOpacity})`;

          // 直接使用原始色号（MARD: H9, A1 等已经够简短）
          const displayColorId = bead.id;

          let displayText = '';
          if (bead.id !== currentColorId || segmentCount >= 99) {
            currentColorId = bead.id;
            segmentCount = 1;
            displayText = displayColorId;
          } else {
            segmentCount++;
            displayText = segmentCount.toString();
          }

          ctx.fillText(displayText, px, py);
        }
      }
    }
  }, [beadData, scale, showColorId, selection, getColorIndicesInBlock]);

  // 取消选中
  const handleClearSelection = () => {
    setSelection({ type: null, blockX: 0, blockY: 0 });
  };

  // 如果没有数据
  if (!beadData) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>请先在编辑器中生成图案</p>
          <button style={styles.backButton} onClick={() => navigate('/mobile/create')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{...styles.container, height: viewportHeight}} data-making-page>
      {/* 头部 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>制作模式</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* 预览区 */}
      <div style={styles.previewSection}>
        <div style={styles.canvasContainer}>
          {/* 浮动控制栏 */}
          <div style={styles.floatingControls}>
            {/* 左侧：缩放 */}
            <div style={styles.zoomControls}>
              <button style={styles.miniBtn} onClick={() => setScale(Math.max(0.5, scale - 0.5))}>−</button>
              <span style={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
              <button style={styles.miniBtn} onClick={() => setScale(Math.min(6, scale + 0.5))}>+</button>
              <button style={{...styles.miniBtn, fontSize: '10px', padding: '2px 6px'}} onClick={handleFitScreen} title="适应屏幕">适应</button>
            </div>

            {/* 右侧：功能按钮 */}
            <div style={styles.controlBtns}>
              <button
                style={styles.miniBtn}
                onClick={() => setShowExportModal(true)}
                title="下载图纸"
              >
                <DownloadSimple size={14} />
              </button>
              <button
                style={{...styles.miniBtn, ...(wakeLockActive ? styles.miniBtnActive : {})}}
                onClick={toggleWakeLock}
                title={wakeLockActive ? '关闭屏幕常亮' : '开启屏幕常亮'}
              >
                {wakeLockActive ? <Lightning size={14} weight="fill" /> : <LightningSlash size={14} />}
              </button>
              <button
                style={{...styles.miniBtn, ...(voiceEnabled ? styles.miniBtnActive : {})}}
                onClick={() => {
                  if (!canSpeak()) {
                    toast.info('您的浏览器不支持语音功能');
                    return;
                  }
                  setVoiceEnabled(!voiceEnabled);
                  toast.info(voiceEnabled ? '语音提示已关闭' : '语音提示已开启');
                }}
                title={voiceEnabled ? '关闭语音' : '开启语音'}
              >
                {voiceEnabled ? <SpeakerHigh size={14} /> : <SpeakerSlash size={14} />}
              </button>
              <button
                style={styles.miniBtn}
                onClick={() => setShowSettings(!showSettings)}
                title="设置"
              >
                <Gear size={14} />
              </button>
            </div>
          </div>

          {/* 设置面板 */}
          {showSettings && (
            <div style={styles.settingsPanel}>
              <div style={styles.settingsHeader}>
                <span style={styles.settingsTitle}>设置</span>
                <button style={styles.closeBtn} onClick={() => setShowSettings(false)}>
                  <X size={16} />
                </button>
              </div>
              <div style={styles.settingsContent}>
                <div style={styles.settingRow}>
                  <span style={styles.settingLabel}>显示色号</span>
                  <button
                    style={{...styles.toggleBtn, ...(showColorId ? styles.toggleBtnActive : {})}}
                    onClick={() => setShowColorId(!showColorId)}
                  >
                    {showColorId ? <Eye size={16} /> : <EyeSlash size={16} />}
                  </button>
                </div>
                <div style={styles.settingHint}>
                  <p style={styles.hintText}>
                    <strong>操作说明：</strong>
                  </p>
                  <p style={styles.hintText}>
                    • 缩小时点击 → 选中区块
                  </p>
                  <p style={styles.hintText}>
                    • 放大时点击 → 高亮同色格子
                  </p>
                  <p style={styles.hintText}>
                    • 再次点击 → 取消选中
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 状态提示 */}
          <div style={styles.statusHint}>
            {selection.type === null && (
              <span>{scale < ZOOM_THRESHOLD ? '点击选择区块' : '点击选择颜色'}</span>
            )}
            {selection.type === 'block' && (
              <span>区块 ({selection.blockX + 1}, {selection.blockY + 1})</span>
            )}
            {selection.type === 'color' && selection.colorHex && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    backgroundColor: selection.colorHex,
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                />
                区块{colorCountInBlock}颗 / 全部{colorCountTotal}颗
              </span>
            )}
          </div>

          {/* 坐标提示框 */}
          <CoordinateTooltip
            visible={tooltipState.visible}
            row={tooltipState.row}
            col={tooltipState.col}
            cellScreenX={tooltipState.screenX}
            cellScreenY={tooltipState.screenY}
            containerWidth={wrapperRef.current?.clientWidth || 300}
            containerHeight={wrapperRef.current?.clientHeight || 300}
            onHide={() => setTooltipState(prev => ({ ...prev, visible: false }))}
          />

          {/* Canvas */}
          <div
            ref={wrapperRef}
            style={{...styles.canvasWrapper, cursor: isDragging ? 'grabbing' : 'grab'}}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <canvas
              ref={canvasRef}
              style={{
                ...styles.canvas,
                transform: `translate(${translateX}px, ${translateY}px)`,
              }}
              onClick={handleCanvasClick}
            />
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      <div style={styles.bottomBar}>
        {selection.type === null ? (
          <div style={styles.bottomHint}>
            {scale < ZOOM_THRESHOLD
              ? '点击画布选择区块'
              : '点击格子查看坐标'}
          </div>
        ) : (
          <div style={styles.bottomActions}>
            {/* 提示：再次点击可取消 */}
            <span style={styles.bottomHintSmall}>再次点击可取消选中</span>
            {/* 选中颜色时显示替换按钮 */}
            {selection.type === 'color' && selectedBeadColor && (
              <button
                style={{...styles.actionBtn, ...styles.actionBtnPrimary}}
                onClick={() => setShowReplaceModal(true)}
              >
                <Swap size={18} />
                替换颜色
              </button>
            )}
          </div>
        )}
      </div>

      {/* 导出弹窗 */}
      {beadData && (
        <ExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          beadData={beadData}
        />
      )}

      {/* 颜色替换弹窗 */}
      {selectedBeadColor && (
        <ColorReplaceModal
          visible={showReplaceModal}
          onClose={() => setShowReplaceModal(false)}
          currentColor={selectedBeadColor}
          totalCount={colorCountTotal}
          onReplace={handleColorReplace}
        />
      )}

      {/* 底部导航栏 */}
      <BottomNav transparent />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100dvh',
    maxHeight: '-webkit-fill-available',
    display: 'flex',
    flexDirection: 'column',
    background: colors.bg.primary,
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
    flexShrink: 0,
  },

  backBtn: {
    ...mixins.backButton,
  },

  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },

  previewSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
    background: colors.bg.card,
    overflow: 'hidden',
    position: 'relative' as const,
    minHeight: 0,
  },

  canvasContainer: {
    position: 'relative' as const,
    flex: 1,
    width: '100%',
    height: '100%',
  },

  floatingControls: {
    position: 'absolute' as const,
    top: '8px',
    left: '8px',
    right: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },

  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    borderRadius: radius.button,
    pointerEvents: 'auto',
  },

  miniBtn: {
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: radius.bead,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  miniBtnActive: {
    background: `${colors.bead.cyan}40`,
    color: colors.bead.cyan,
  },

  zoomLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffffff',
    minWidth: '36px',
    textAlign: 'center' as const,
  },

  controlBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    borderRadius: radius.button,
    pointerEvents: 'auto',
  },

  settingsPanel: {
    position: 'absolute' as const,
    top: '50px',
    right: '8px',
    width: '200px',
    background: 'rgba(30, 30, 40, 0.95)',
    backdropFilter: 'blur(12px)',
    borderRadius: radius.card,
    border: `1px solid ${colors.border.soft}`,
    boxShadow: shadows.lg,
    zIndex: 30,
    overflow: 'hidden',
  },

  settingsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  settingsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: '#ffffff',
  },

  closeBtn: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: radius.bead,
    color: colors.text.muted,
    cursor: 'pointer',
  },

  settingsContent: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  settingLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },

  toggleBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.bead,
    color: colors.text.muted,
    cursor: 'pointer',
  },

  toggleBtnActive: {
    background: `${colors.bead.cyan}20`,
    borderColor: colors.bead.cyan,
    color: colors.bead.cyan,
  },

  settingHint: {
    marginTop: 8,
    padding: '8px',
    background: colors.bg.tertiary,
    borderRadius: radius.bead,
  },

  hintText: {
    margin: '4px 0',
    fontSize: '11px',
    color: colors.text.muted,
    lineHeight: 1.4,
  },

  statusHint: {
    position: 'absolute' as const,
    top: '50px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    padding: '6px 14px',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    borderRadius: radius.full,
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffffff',
    zIndex: 20,
  },

  canvasWrapper: {
    position: 'absolute' as const,
    top: '50px',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    background: '#1a1a24',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    touchAction: 'none',
    cursor: 'grab',
  },

  canvas: {
    borderRadius: radius.bead,
    imageRendering: 'pixelated',
    flexShrink: 0,
  },

  bottomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    marginBottom: '65px', // 给底部导航栏留出空间
    background: colors.bg.secondary,
    borderTop: `1px solid ${colors.border.soft}`,
    flexShrink: 0,
    minHeight: 44,
  },

  bottomHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted,
    textAlign: 'center' as const,
  },

  bottomHintSmall: {
    fontSize: '12px',
    color: colors.text.muted,
    marginRight: 'auto',
  },

  bottomActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
  },

  actionBtnPrimary: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`,
    border: 'none',
    color: '#ffffff',
    boxShadow: shadows.button,
  },

  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },

  emptyText: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    marginBottom: '20px',
  },

  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: shadows.button,
  },
};

export default MakingPage;
