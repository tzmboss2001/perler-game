import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, GridFour, Palette, ListBullets, ArrowClockwise, ArrowCounterClockwise, Play, PencilSimple, ArrowsClockwise, ShareNetwork, ShoppingCart, Prohibit, CheckCircle } from '@phosphor-icons/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors, radius, typography, shadows, animation, mixins } from '../../styles/designSystem';
import { pixelizeImage, PixelData } from '../../services/pixelizeService';
import { matchPixelsToBead, calculateBeadStatistics, renderBeadsToCanvas, BeadPixelData, BeadStatistics, replaceColor, findNextSimilarColor, reduceColors, smartMergeColors } from '../../services/colorMatchService';
import SmartMergeModal from '../../components/SmartMergeModal';
import { colorCountOptions, defaultColorCount, allBeadColors, BeadColor } from '../../data/beadColors';
import { useEditorStore, EditorTool } from '../../store/editorStore';
import EditorToolbar from '../../components/EditorToolbar';
import ColorPicker from '../../components/ColorPicker';
import InteractiveCanvas from '../../components/InteractiveCanvas';
import SaveProjectModal from '../../components/SaveProjectModal';
import ShareModal from '../../components/ShareModal';
import ShoppingListModal from '../../components/ShoppingListModal';
import LoginModal from '../../components/LoginModal';
import { useUserStore } from '../../store/userStore';
import { projectApi } from '../../services/api/projectApi';
import { uploadApi } from '../../services/api/uploadApi';
import { useToast } from '../../components/Toast';
import BottomNav from '../../components/BottomNav';
import { localStorageService } from '../../services/localStorageService';
import { recommendBoard } from '../../services/boardService';

/**
 * 编辑器页面 - 核心功能
 * 支持手动编辑，触摸和鼠标操作
 */
const EditorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { isLoggedIn, initUser } = useUserStore();
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const savedScrollPosition = useRef<number>(0);

  // 从创建页传来的数据，或从 sessionStorage 读取（用于测试）
  interface EditorStateData {
    imageData?: string;
    colorCount?: number;
    gridWidth?: number; // 智能推荐的网格宽度
    customColorIds?: string[]; // 自定义色板选中的颜色ID
  }
  const stateData: EditorStateData = (location.state as EditorStateData) || {};
  const sessionData = React.useMemo<EditorStateData>(() => {
    try {
      const stored = sessionStorage.getItem('editorData');
      if (stored) {
        sessionStorage.removeItem('editorData');
        return JSON.parse(stored);
      }
    } catch (e) {}
    return {};
  }, []);
  const mergedStateData = stateData.imageData ? stateData : sessionData;
  const { imageData, colorCount: initialColorCount, gridWidth: initialGridWidth, customColorIds } = mergedStateData;

  // 状态
  const [gridSize, setGridSize] = useState(initialGridWidth || 52);
  const [colorCount, setColorCount] = useState<number>(initialColorCount || defaultColorCount);
  const [simplifyLevel, setSimplifyLevel] = useState<number>(0); // 简化度 0-100%
  const [saturationBoost, setSaturationBoost] = useState<number>(0); // 饱和度增强 0-100，默认0（关闭）
  const [vibrancyPreference, setVibrancyPreference] = useState<number>(0); // 鲜艳度偏好 0-100，默认0（关闭）
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [cellSize, setCellSize] = useState(12);
  const [recentColors, setRecentColors] = useState<BeadColor[]>([]);
  const [isEditMode, setIsEditMode] = useState(false); // 编辑模式状态
  const [isEditPanelClosing, setIsEditPanelClosing] = useState(false); // 编辑面板关闭动画状态
  const [replacedColors, setReplacedColors] = useState<Map<string, BeadColor>>(new Map()); // 记录已替换的颜色
  const [initialBeadData, setInitialBeadData] = useState<BeadPixelData | null>(null); // 保存初始数据用于还原
  const [highlightedColorId, setHighlightedColorId] = useState<string | null>(null); // 高亮显示的颜色ID
  const [triedColorsMap, setTriedColorsMap] = useState<Map<string, string[]>>(new Map()); // 每个初始颜色尝试过的所有颜色
  const [showSaveModal, setShowSaveModal] = useState(false); // 保存方案弹窗
  const [isSaving, setIsSaving] = useState(false); // 保存中状态
  const [showShareModal, setShowShareModal] = useState(false); // 分享弹窗
  const [showShoppingList, setShowShoppingList] = useState(false); // 采购清单弹窗
  const [excludedColorIds, setExcludedColorIds] = useState<Set<string>>(new Set()); // 排除的颜色ID
  const [showLoginModal, setShowLoginModal] = useState(false); // 登录弹窗
  const [showSmartMerge, setShowSmartMerge] = useState(false); // 智能合并弹窗

  // 背景处理模式状态
  const [isBackgroundMode, setIsBackgroundMode] = useState(false); // 是否处于背景处理模式
  const [bgSelectedColorId, setBgSelectedColorId] = useState<string | null>(null); // 背景模式选中的颜色ID
  const [bgExcludedIndices, setBgExcludedIndices] = useState<Set<number>>(new Set()); // 背景模式排除的网格索引
  const [bgViewMode, setBgViewMode] = useState<'select' | 'view'>('select'); // 背景模式交互：select=选择，view=查看

  // Zustand store
  const {
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    beadData,
    setBeadData,
    saveToHistory,
    undo,
    redo,
    setBeadAt,
    floodFill,
    // 直接订阅 history 状态，确保 UI 能及时更新
    history,
    historyIndex,
  } = useEditorStore();

  // 计算 canUndo/canRedo（直接依赖状态，而不是调用函数）
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // 统计数据
  const [statistics, setStatistics] = useState<BeadStatistics[]>([]);

  // 处理图片
  // isRegenerate: 是否是重新生成（调整参数后），如果是则不重置初始数据和替换记录
  const processImage = useCallback(async (isRegenerate: boolean = false) => {
    if (!imageData) return;

    // 只有首次加载才显示loading（重新生成时不显示，避免闪烁）
    if (!isRegenerate) {
      setIsProcessing(true);
    }

    try {
      // 1. 像素化
      const pixels = await pixelizeImage(imageData, {
        gridWidth: gridSize,
        keepAspectRatio: true,
      });

      // 2. 颜色匹配（使用 colorCount + Lab色彩空间 + 饱和度增强）
      // 合并排除颜色：用户手动排除 + 自定义色板外的颜色
      const excludeList = Array.from(excludedColorIds);
      if (customColorIds && customColorIds.length > 0) {
        // 自定义色板模式：排除不在列表中的所有 MARD 颜色
        const customSet = new Set(customColorIds);
        const { mardColors: allMard } = await import('../../data/beadColors');
        allMard.forEach(c => {
          if (!customSet.has(c.id) && !excludeList.includes(c.id)) {
            excludeList.push(c.id);
          }
        });
      }
      let beads = matchPixelsToBead(pixels, {
        colorCount,
        useLabSpace: true,           // 使用 Lab 色彩空间，更符合人眼感知
        saturationBoost,             // 饱和度增强
        vibrancyPreference,          // 鲜艳度偏好
        excludeColors: excludeList,  // 排除的颜色
      });

      // 3. 简化度（如果 simplifyLevel > 0）
      // simplifyLevel 0-100% 映射到保留颜色比例
      // 0% = 不简化，100% = 最大简化（保留约 5 种颜色）
      if (simplifyLevel > 0) {
        const stats = calculateBeadStatistics(beads);
        const currentColorCount = stats.length;
        // 计算目标颜色数量：0% 保留全部，100% 保留约 5 种
        const minColors = 5;
        const targetColors = Math.max(
          minColors,
          Math.round(currentColorCount * (1 - simplifyLevel / 120))
        );
        if (targetColors < currentColorCount) {
          beads = reduceColors(beads, targetColors, allBeadColors);
        }
      }

      // 4. 设置到store
      setBeadData(beads);

      // 5. 保存初始数据（仅首次加载时保存，重新生成时保留原始数据）
      if (!isRegenerate) {
        setInitialBeadData(JSON.parse(JSON.stringify(beads)));
      }

      // 6. 统计
      const stats = calculateBeadStatistics(beads);
      setStatistics(stats);

      // 7. 设置默认颜色
      if (!currentColor && stats.length > 0) {
        setCurrentColor(stats[0].color);
      }

      // 8. 重置替换记录（仅首次加载时重置）
      if (!isRegenerate) {
        setReplacedColors(new Map());
      }

    } catch (error) {
      console.error('处理图片失败:', error);
    } finally {
      setIsProcessing(false);
      // 恢复滚动位置（在 DOM 完全更新后）
      // 使用双重 requestAnimationFrame 确保 React 渲染完成
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (containerRef.current && savedScrollPosition.current > 0) {
            containerRef.current.scrollTop = savedScrollPosition.current;
          }
        });
      });
    }
  }, [imageData, gridSize, colorCount, simplifyLevel, saturationBoost, vibrancyPreference, excludedColorIds, setBeadData, currentColor, setCurrentColor]);

  // 初始化用户状态
  useEffect(() => {
    initUser();
  }, [initUser]);

  // 初始处理
  useEffect(() => {
    if (imageData) {
      processImage();
    } else {
      navigate('/mobile/create');
    }
  }, []);

  // 当 beadData 变化时更新统计
  useEffect(() => {
    if (beadData) {
      const stats = calculateBeadStatistics(beadData);
      setStatistics(stats);
    }
  }, [beadData]);

  // 计算合适的 cellSize
  useEffect(() => {
    if (beadData) {
      const containerWidth = window.innerWidth - 64;
      const newCellSize = Math.floor(containerWidth / beadData.width);
      setCellSize(Math.max(8, Math.min(16, newCellSize)));
    }
  }, [beadData]);

  // 注入滑动动画 keyframes
  useEffect(() => {
    const styleId = 'slide-panel-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutToLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // 关闭编辑面板（带动画）
  const handleCloseEditPanel = useCallback(() => {
    setIsEditPanelClosing(true);
    setTimeout(() => {
      setIsEditMode(false);
      setIsEditPanelClosing(false);
    }, 200); // 动画时长
  }, []);

  // 获取橡皮擦颜色（白色）
  const getEraserColor = useCallback(() => {
    return allBeadColors.find(c => c.name.toLowerCase().includes('white')) || allBeadColors[0];
  }, []);

  // 处理珠子点击
  const handleBeadClick = useCallback((x: number, y: number) => {
    if (!beadData) return;

    if (currentTool === 'fill') {
      const fillColor = currentColor || getEraserColor();
      floodFill(x, y, fillColor);
      saveToHistory();
    } else if (currentTool === 'brush') {
      if (currentColor) {
        setBeadAt(x, y, currentColor);
      }
    } else if (currentTool === 'eraser') {
      setBeadAt(x, y, getEraserColor());
    }
  }, [beadData, currentTool, currentColor, floodFill, setBeadAt, getEraserColor, saveToHistory]);

  // 处理拖动绘制
  const handleBeadDrag = useCallback((x: number, y: number) => {
    if (!beadData) return;

    if (currentTool === 'brush' && currentColor) {
      setBeadAt(x, y, currentColor);
    } else if (currentTool === 'eraser') {
      setBeadAt(x, y, getEraserColor());
    }
  }, [beadData, currentTool, currentColor, setBeadAt, getEraserColor]);

  // 拖动结束时保存历史
  const handleDragEnd = useCallback(() => {
    if (currentTool === 'brush' || currentTool === 'eraser') {
      saveToHistory();
    }
  }, [currentTool, saveToHistory]);

  // 吸色
  const handlePickColor = useCallback((color: BeadColor) => {
    setCurrentColor(color);
    setCurrentTool('brush'); // 吸色后自动切换到画笔
    addToRecentColors(color);
  }, [setCurrentColor, setCurrentTool]);

  // 添加到最近使用
  const addToRecentColors = (color: BeadColor) => {
    setRecentColors(prev => {
      const filtered = prev.filter(c => c.id !== color.id);
      return [color, ...filtered].slice(0, 10);
    });
  };

  // 选择颜色（从颜色选择器）
  const handleSelectColor = (color: BeadColor) => {
    setCurrentColor(color);
    addToRecentColors(color);
    setShowColorPicker(false);
  };

  // 点击统计列表中的颜色 - 高亮显示
  const handleStatsColorClick = (color: BeadColor) => {
    // 如果点击已高亮的颜色，取消高亮；否则高亮该颜色
    if (highlightedColorId === color.id) {
      setHighlightedColorId(null);
    } else {
      setHighlightedColorId(color.id);
    }
  };

  // 处理颜色替换 - 支持多次更换
  // replacedColors: Map<当前颜色ID, 初始颜色对象>
  // triedColorsMap: Map<初始颜色ID, 已尝试过的颜色ID数组>
  const handleReplaceColor = useCallback((colorId: string) => {
    if (!beadData) return;

    // 找到当前颜色对象
    const currentColorObj = allBeadColors.find(c => c.id === colorId);
    if (!currentColorObj) return;

    // 找到初始颜色（如果之前替换过，从 replacedColors 获取；否则就是当前颜色）
    const initialColor = replacedColors.get(colorId) || currentColorObj;
    const initialColorId = initialColor.id;

    // 获取该初始颜色已经尝试过的所有颜色
    const triedColors = triedColorsMap.get(initialColorId) || [initialColorId];

    // 找到下一个相近颜色（排除所有已尝试过的颜色）
    const nextColor = findNextSimilarColor(colorId, triedColors);

    if (nextColor) {
      // 替换颜色
      const newBeadData = replaceColor(beadData, colorId, nextColor);
      setBeadData(newBeadData);

      // 记录映射：新颜色ID -> 初始颜色对象
      setReplacedColors(prev => {
        const next = new Map(prev);
        next.delete(colorId); // 删除旧的映射
        next.set(nextColor.id, initialColor); // 新颜色ID -> 初始颜色
        return next;
      });

      // 更新已尝试颜色列表
      setTriedColorsMap(prev => {
        const next = new Map(prev);
        const tried = [...triedColors, nextColor.id];
        next.set(initialColorId, tried);
        return next;
      });

      // 取消高亮，让用户看到更换后的效果
      setHighlightedColorId(null);

      saveToHistory();
    }
  }, [beadData, replacedColors, triedColorsMap, setBeadData, saveToHistory]);

  // 恢复单个颜色到初始状态
  const handleRestoreColor = useCallback((colorId: string) => {
    const initial = replacedColors.get(colorId);
    if (!initial || !beadData) return;

    // 将当前颜色替换回初始颜色
    const newBeadData = replaceColor(beadData, colorId, initial);
    setBeadData(newBeadData);

    // 删除映射记录
    setReplacedColors(prev => {
      const next = new Map(prev);
      next.delete(colorId);
      return next;
    });

    // 清除该颜色的尝试记录
    setTriedColorsMap(prev => {
      const next = new Map(prev);
      next.delete(initial.id);
      return next;
    });

    // 取消高亮
    setHighlightedColorId(null);

    saveToHistory();
  }, [beadData, replacedColors, setBeadData, saveToHistory]);

  // 还原全部到初始状态
  const handleRestoreAll = useCallback(() => {
    if (!initialBeadData) return;

    // 深拷贝初始数据
    const restoredData = JSON.parse(JSON.stringify(initialBeadData));
    setBeadData(restoredData);
    setReplacedColors(new Map());
    setTriedColorsMap(new Map()); // 清除所有尝试记录
    setHighlightedColorId(null); // 取消高亮
    saveToHistory();
  }, [initialBeadData, setBeadData, saveToHistory]);

  // 排除/取消排除颜色
  const handleToggleExcludeColor = useCallback((colorId: string) => {
    setExcludedColorIds(prev => {
      const next = new Set(prev);
      if (next.has(colorId)) {
        next.delete(colorId);
      } else {
        next.add(colorId);
      }
      return next;
    });
  }, []);

  // ========== 背景处理模式相关函数 ==========

  // 进入背景处理模式
  const handleEnterBackgroundMode = useCallback(() => {
    setIsBackgroundMode(true);
    setBgSelectedColorId(null);
    setBgExcludedIndices(new Set());
    setBgViewMode('select'); // 默认选择模式
    setHighlightedColorId(null); // 清除普通高亮
  }, []);

  // 退出背景处理模式
  const handleExitBackgroundMode = useCallback(() => {
    setIsBackgroundMode(false);
    setBgSelectedColorId(null);
    setBgExcludedIndices(new Set());
    setBgViewMode('select');
  }, []);

  // 背景模式下点击网格选择颜色
  const handleBgSelectColor = useCallback((index: number) => {
    if (!beadData) return;
    const bead = beadData.beads[index];
    if (!bead) return; // 已透明，不可选
    setBgSelectedColorId(bead.id);
    setBgExcludedIndices(new Set()); // 清空排除列表
  }, [beadData]);

  // 背景模式下排除/恢复单个网格
  const handleBgToggleExclude = useCallback((index: number) => {
    setBgExcludedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // 获取背景模式高亮网格列表
  const getBgHighlightedIndices = useCallback((): number[] => {
    if (!beadData || !bgSelectedColorId) return [];
    return beadData.beads
      .map((bead, index) => ({ bead, index }))
      .filter(({ bead, index }) =>
        bead &&
        bead.id === bgSelectedColorId &&
        !bgExcludedIndices.has(index)
      )
      .map(({ index }) => index);
  }, [beadData, bgSelectedColorId, bgExcludedIndices]);

  // 确认透明化
  const handleBgConfirmTransparent = useCallback(() => {
    if (!beadData) return;
    const indices = getBgHighlightedIndices();
    if (indices.length === 0) return;

    const newBeads = [...beadData.beads];
    indices.forEach(i => {
      newBeads[i] = null as any; // 设为透明（null）
    });

    setBeadData({ ...beadData, beads: newBeads });
    saveToHistory();

    // 重置选择状态，允许继续处理其他颜色
    setBgSelectedColorId(null);
    setBgExcludedIndices(new Set());
  }, [beadData, getBgHighlightedIndices, setBeadData, saveToHistory]);

  // 清除当前选择
  const handleBgClearSelection = useCallback(() => {
    setBgSelectedColorId(null);
    setBgExcludedIndices(new Set());
  }, []);

  // 点击"开始制作"按钮
  const handleStartMakingClick = (e?: React.MouseEvent) => {
    if (!beadData) return;
    // 测试模式：按住 Shift 点击可跳过保存直接进入制作模式
    if (e?.shiftKey) {
      navigate('/mobile/making', {
        state: { beadData, colorCount },
      });
      return;
    }
    // 直接弹保存弹窗（不再要求登录）
    setShowSaveModal(true);
  };

  // 登录成功后的回调
  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // 登录成功后自动打开保存弹窗
    setShowSaveModal(true);
  };

  // 生成缩略图
  const generateThumbnail = useCallback(() => {
    if (!beadData) return '';
    const canvas = document.createElement('canvas');
    renderBeadsToCanvas(beadData, canvas, 4, false, false);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, [beadData]);

  // 保存方案并开始制作
  const handleSaveProject = async (name: string) => {
    if (!beadData) {
      toast.error('没有可保存的图案数据');
      return;
    }

    setIsSaving(true);
    try {
      // 生成缩略图
      const thumbnail = generateThumbnail();
      const originalImage = imageData || thumbnail;

      if (isLoggedIn) {
        // 已登录：保存到云端
        let thumbnailUrl = '';
        let originalImageUrl = '';
        try {
          const [thumbUrl, origUrl] = await Promise.all([
            uploadApi.uploadImage(thumbnail, 'thumbnails'),
            uploadApi.uploadImage(originalImage, 'originals'),
          ]);
          thumbnailUrl = thumbUrl;
          originalImageUrl = origUrl;
        } catch (uploadError) {
          console.error('图片上传失败:', uploadError);
          toast.error('图片上传失败，请检查网络后重试');
          setIsSaving(false);
          return;
        }

        const response = await projectApi.create({
          name,
          thumbnail_url: thumbnailUrl,
          original_image: originalImageUrl,
          bead_data: {
            width: beadData.width,
            height: beadData.height,
            beads: beadData.beads.map(b => ({
              id: b.id,
              name: b.name,
              nameCN: b.nameCN,
              rgb: b.rgb,
              hex: b.hex,
              brand: b.brand,
            })),
          },
          settings: {
            gridSize,
            gridHeight: beadData.height,
            colorCount,
            saturationBoost,
            vibrancyPreference,
          },
        });

        if (response.code === 0) {
          toast.success('方案已保存到云端！');
          setShowSaveModal(false);
          navigate('/mobile/making', {
            state: { beadData, colorCount, projectId: response.data.id },
          });
        } else {
          console.error('保存失败:', response.msg);
          toast.warning('云端保存失败，已保存到本地');
          // 回退到本地保存
          saveToLocal(name, thumbnail, originalImage);
        }
      } else {
        // 未登录：保存到本地
        saveToLocal(name, thumbnail, originalImage);
      }
    } catch (error) {
      console.error('保存方案失败:', error);
      toast.warning('保存异常，但您可以继续制作');
      setShowSaveModal(false);
      navigate('/mobile/making', {
        state: { beadData, colorCount },
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 保存到本地 localStorage
  const saveToLocal = (name: string, thumbnail: string, originalImage: string) => {
    if (!beadData) return;
    try {
      const result = localStorageService.createProject({
        name,
        thumbnail,
        originalImage,
        beadData: {
          width: beadData.width,
          height: beadData.height,
          beads: beadData.beads.map(b => b ? {
            id: b.id,
            name: b.name,
            nameCN: b.nameCN,
            rgb: b.rgb,
            hex: b.hex,
            brand: b.brand,
          } : { id: '', name: '', nameCN: '', rgb: [0, 0, 0] as [number, number, number], hex: '#000', brand: 'mard' }),
        },
        settings: {
          gridSize,
          gridHeight: beadData.height,
          colorCount,
          saturationBoost,
          vibrancyPreference,
        },
      });
      toast.success('方案已保存到本地！');
      setShowSaveModal(false);
      navigate('/mobile/making', {
        state: { beadData, colorCount, localProjectId: result.id },
      });
    } catch (e) {
      console.error('本地保存失败:', e);
      toast.warning('保存失败，但您可以继续制作');
      setShowSaveModal(false);
      navigate('/mobile/making', {
        state: { beadData, colorCount },
      });
    }
  };

  // 重新生成（保持滚动位置，不重置初始数据）
  const handleRegenerate = () => {
    // 保存当前滚动位置
    if (containerRef.current) {
      savedScrollPosition.current = containerRef.current.scrollTop;
    }
    processImage(true); // true 表示是重新生成，不重置初始数据和替换记录
  };

  // 获取当前颜色数量选项信息
  const currentColorOption = colorCountOptions.find(opt => opt.count === colorCount);
  const totalBeads = beadData?.beads.length || 0;

  // 智能推荐拼豆板配置
  const boardRecommendation = beadData ? recommendBoard(beadData.width, beadData.height) : null;

  return (
    <div ref={containerRef} style={styles.container}>
      {/* 固定头部导航 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} weight="bold" />
        </button>
        <h1 style={styles.title}>编辑图案</h1>
        <div style={styles.headerPlaceholder} />
      </div>
      {/* Header占位 */}
      <div style={styles.headerSpacer} />

      {/* 图案预览区 - 固定在顶部 */}
      <div style={styles.previewSection}>
          {isProcessing ? (
            <div style={styles.loadingBox}>
              <div style={styles.loadingSpinner} />
              <p style={styles.loadingText}>正在生成图案...</p>
            </div>
          ) : beadData ? (
            <InteractiveCanvas
              beadData={beadData}
              cellSize={cellSize}
              currentTool={currentTool}
              currentColor={currentColor}
              isEditMode={isEditMode}
              highlightedColorId={highlightedColorId}
              onBeadClick={handleBeadClick}
              onBeadDrag={handleBeadDrag}
              onDragEnd={handleDragEnd}
              onPickColor={handlePickColor}
            />
          ) : null}

          {/* 浮动编辑按钮 - 预览区左上角 */}
          {beadData && !isEditMode && (
            <button
              style={styles.floatingEditBtn}
              onClick={() => setIsEditMode(true)}
            >
              <PencilSimple size={18} weight="fill" />
            </button>
          )}

          {/* 左侧滑出编辑面板 */}
          {beadData && isEditMode && (
            <div style={{
              ...styles.slidePanel,
              animation: isEditPanelClosing ? 'slideOutToLeft 0.2s ease-in forwards' : 'slideInFromLeft 0.25s ease-out',
            }}>
              <div style={styles.slidePanelHeader}>
                <button
                  style={styles.slidePanelClose}
                  onClick={handleCloseEditPanel}
                >
                  ✕
                </button>
              </div>
              <div style={styles.slidePanelTools}>
                {/* 当前颜色 */}
                <button
                  style={styles.slidePanelColorBtn}
                  onClick={() => setShowColorPicker(true)}
                >
                  <div
                    style={{
                      ...styles.slidePanelColorPreview,
                      backgroundColor: currentColor?.hex || '#ffffff',
                    }}
                  />
                  <span style={styles.slidePanelColorLabel}>
                    {currentColor?.id || '选色'}
                  </span>
                </button>

                {/* 工具按钮 - 垂直排列 */}
                <div style={styles.slidePanelToolGroup}>
                  {[
                    { id: 'brush' as const, icon: '🖌️', label: '画笔' },
                    { id: 'fill' as const, icon: '🪣', label: '填充' },
                    { id: 'eraser' as const, icon: '🧽', label: '橡皮' },
                    { id: 'picker' as const, icon: '💧', label: '吸色' },
                  ].map((tool) => (
                    <button
                      key={tool.id}
                      style={{
                        ...styles.slidePanelToolBtn,
                        ...(currentTool === tool.id ? styles.slidePanelToolBtnActive : {}),
                      }}
                      onClick={() => setCurrentTool(tool.id)}
                    >
                      <span style={styles.slidePanelToolIcon}>{tool.icon}</span>
                      <span style={styles.slidePanelToolLabel}>{tool.label}</span>
                    </button>
                  ))}
                </div>

                {/* 撤销/重做 */}
                <div style={styles.slidePanelHistoryGroup}>
                  <button
                    style={{
                      ...styles.slidePanelHistoryBtn,
                      opacity: canUndo ? 1 : 0.4,
                    }}
                    onClick={undo}
                    disabled={!canUndo}
                    title="撤销"
                  >
                    <ArrowCounterClockwise size={12} weight="bold" />
                  </button>
                  <button
                    style={{
                      ...styles.slidePanelHistoryBtn,
                      opacity: canRedo ? 1 : 0.4,
                    }}
                    onClick={redo}
                    disabled={!canRedo}
                    title="重做"
                  >
                    <ArrowClockwise size={12} weight="bold" />
                  </button>
                </div>
                {/* 背景透明 */}
                <button
                  style={styles.slidePanelMagicBtn}
                  onClick={handleEnterBackgroundMode}
                  title="背景透明"
                >
                  <span style={styles.slidePanelToolIcon}>✨</span>
                  <span style={styles.slidePanelToolLabel}>透明</span>
                </button>
              </div>
            </div>
          )}

          {/* 尺寸信息 + 板子规格 */}
          {beadData && (
            <div style={styles.infoRow}>
              <div style={styles.sizeInfoGroup}>
                <div style={styles.sizeInfo}>
                  <GridFour size={14} weight="fill" />
                  <span>{beadData.width} x {beadData.height} = {totalBeads} 颗</span>
                </div>
                {boardRecommendation && (
                  <div style={styles.boardRecommendation}>
                    <span style={styles.boardBadge}>
                      {boardRecommendation.boardSize}钉
                    </span>
                    <span style={styles.boardText}>
                      {boardRecommendation.summary}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      {/* 主内容区 - 可滚动 */}
      <div style={styles.content}>
        {/* 控制面板 - 紧凑版 */}
        <div style={styles.controlPanel}>
          {/* 网格大小 */}
          <div style={styles.controlItem}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>网格宽度</span>
              <span style={styles.controlValue}>{gridSize}</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              onMouseUp={handleRegenerate}
              onTouchEnd={handleRegenerate}
              style={{
                ...styles.slider,
                background: `linear-gradient(to right,
                  ${colors.bead.cyan} 0%,
                  ${colors.bead.cyan} 35%,
                  ${colors.bead.yellow} 50%,
                  ${colors.bead.orange} 70%,
                  #ff6b6b 100%
                )`,
              }}
            />
            <div style={styles.sliderLabels}>
              <span style={styles.sliderLabelGreen}>流畅</span>
              <span style={styles.sliderLabelYellow}>一般</span>
              <span style={styles.sliderLabelRed}>可能卡</span>
            </div>
          </div>

          {/* 鲜艳度增强 */}
          <div style={styles.controlItem}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>鲜艳度</span>
              <span style={styles.controlValue}>{saturationBoost}%</span>
            </div>
            <div style={styles.mergeSliderRow}>
              <span style={styles.mergeLabel}>原色</span>
              <input
                type="range"
                min="0"
                max="30"
                value={saturationBoost}
                onChange={(e) => setSaturationBoost(Number(e.target.value))}
                onMouseUp={handleRegenerate}
                onTouchEnd={handleRegenerate}
                style={styles.slider}
              />
              <span style={styles.mergeLabel}>鲜艳</span>
            </div>
          </div>

          {/* 颜色数量选择 - 已在创建页选择，此处隐藏 */}

          {/* 简化度滑块 - 暂时隐藏（功能已整合到鲜艳度中） */}
          {/* <div style={styles.controlItem}>
            <div style={styles.controlHeader}>
              <span style={styles.controlLabel}>简化度</span>
              <span style={styles.controlValue}>{simplifyLevel}%</span>
            </div>
            <div style={styles.mergeSliderRow}>
              <span style={styles.mergeLabel}>细节</span>
              <input
                type="range"
                min="0"
                max="100"
                value={simplifyLevel}
                onChange={(e) => setSimplifyLevel(Number(e.target.value))}
                onMouseUp={handleRegenerate}
                onTouchEnd={handleRegenerate}
                style={styles.slider}
              />
              <span style={styles.mergeLabel}>简化</span>
            </div>
            <p style={styles.mergeHint}>
              {simplifyLevel === 0 ? '保留全部细节' :
               simplifyLevel <= 25 ? '轻度简化' :
               simplifyLevel <= 50 ? '适度简化' :
               simplifyLevel <= 75 ? '较多简化' : '大幅简化'}
            </p>
          </div> */}
        </div>

        {/* 珠子统计 */}
        <div style={styles.statsSection}>
          <button
            style={styles.statsHeader}
            onClick={() => setShowStats(!showStats)}
          >
            <div style={styles.statsHeaderLeft}>
              <ListBullets size={16} weight="fill" style={{ color: colors.bead.yellow }} />
              <span style={styles.statsTitle}>珠子统计</span>
              <span style={styles.statsCount}>{statistics.length} 种</span>
            </div>
            <div style={styles.statsHeaderRight}>
              <button
                style={styles.smartMergeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSmartMerge(true);
                }}
              >
                <span>合并</span>
              </button>
              <button
                style={styles.shoppingListBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShoppingList(true);
                }}
              >
                <ShoppingCart size={14} weight="fill" />
                <span>清单</span>
              </button>
              <span style={{ ...styles.statsArrow, transform: showStats ? 'rotate(180deg)' : 'rotate(0)' }}>
                ▼
              </span>
            </div>
          </button>

          {showStats && (
            <div style={styles.statsList}>
              {statistics.slice(0, 20).map((stat, index) => (
                <div
                  key={stat.color.id}
                  style={{
                    ...styles.statsItem,
                    ...(highlightedColorId === stat.color.id ? styles.statsItemHighlighted : {}),
                  }}
                  onClick={() => handleStatsColorClick(stat.color)}
                >
                  <span style={styles.statsRank}>{index + 1}</span>
                  <div style={{ ...styles.statsColorBox, backgroundColor: stat.color.hex }} />
                  <span style={styles.statsColorId}>{stat.color.id}</span>
                  <span style={styles.statsColorName}>{stat.color.nameCN}</span>
                  <span style={styles.statsColorCount}>{stat.count}</span>
                  <span style={styles.statsColorPercent}>{stat.percentage.toFixed(1)}%</span>
                  {/* 换色按钮 - 始终显示，支持多次更换 */}
                  <button
                    style={styles.replaceBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReplaceColor(stat.color.id);
                    }}
                  >
                    换
                  </button>
                  {/* 排除按钮 */}
                  <button
                    style={{
                      ...styles.excludeBtn,
                      ...(excludedColorIds.has(stat.color.id) ? styles.excludeBtnActive : {}),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExcludeColor(stat.color.id);
                    }}
                    title={excludedColorIds.has(stat.color.id) ? '取消排除' : '排除此颜色'}
                  >
                    {excludedColorIds.has(stat.color.id) ? <CheckCircle size={12} /> : <Prohibit size={12} />}
                  </button>
                  {/* 还原按钮 - 仅当该颜色被替换过时显示 */}
                  {replacedColors.has(stat.color.id) && (
                    <button
                      style={styles.restoreBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreColor(stat.color.id);
                      }}
                    >
                      原
                    </button>
                  )}
                </div>
              ))}
              {/* 还原全部按钮 - 当有颜色被替换时显示 */}
              {replacedColors.size > 0 && (
                <button style={styles.restoreAllBtn} onClick={handleRestoreAll}>
                  还原全部
                </button>
              )}
              {/* 排除提示 - 当有颜色被排除时显示 */}
              {excludedColorIds.size > 0 && (
                <div style={styles.excludeHint}>
                  已排除 {excludedColorIds.size} 种颜色，调整参数时自动应用
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div style={styles.actions}>
          <button style={styles.secondaryBtn} onClick={() => navigate('/mobile/create')}>
            <ArrowClockwise size={18} />
            重新选图
          </button>
          <button style={styles.secondaryBtn} onClick={() => setShowShareModal(true)} disabled={!beadData}>
            <ShareNetwork size={18} />
            分享
          </button>
          <button
            style={styles.primaryBtn}
            onClick={handleStartMakingClick}
            disabled={!beadData}
          >
            <Play size={18} weight="fill" />
            开始制作
          </button>
        </div>
      </div>

      {/* 颜色选择器弹窗 */}
      {showColorPicker && (
        <ColorPicker
          colorCount={colorCount}
          selectedColor={currentColor}
          onSelectColor={handleSelectColor}
          onClose={() => setShowColorPicker(false)}
          recentColors={recentColors}
        />
      )}

      {/* 登录弹窗 */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="请先登录"
        message="登录后才能保存作品到云端"
      />

      {/* 保存方案弹窗 */}
      <SaveProjectModal
        visible={showSaveModal}
        onSave={handleSaveProject}
        onCancel={() => setShowSaveModal(false)}
        loading={isSaving}
        isLoggedIn={isLoggedIn}
      />

      {/* 分享弹窗 */}
      {beadData && (
        <ShareModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          imageData={(() => {
            const canvas = document.createElement('canvas');
            renderBeadsToCanvas(beadData, canvas, 10, true, false);
            return canvas.toDataURL('image/png');
          })()}
          title="我的拼豆作品"
          stats={statistics.map(s => ({
            color: s.color.hex,
            count: s.count,
            name: s.color.nameCN,
          }))}
          gridSize={{ width: beadData.width, height: beadData.height }}
        />
      )}

      {/* 采购清单弹窗 */}
      {beadData && (
        <ShoppingListModal
          visible={showShoppingList}
          onClose={() => setShowShoppingList(false)}
          items={statistics.map(s => ({
            id: s.color.id,
            name: s.color.name,
            nameCN: s.color.nameCN,
            hex: s.color.hex,
            count: s.count,
            percentage: s.percentage,
          }))}
          gridSize={{ width: beadData.width, height: beadData.height }}
          brand="Artkal"
        />
      )}

      {/* 智能合并弹窗 */}
      {beadData && (
        <SmartMergeModal
          visible={showSmartMerge}
          onClose={() => setShowSmartMerge(false)}
          beadData={beadData}
          onConfirm={(mergedData) => {
            saveToHistory(beadData.beads);
            setBeadData(mergedData);
            setStatistics(calculateBeadStatistics(mergedData));
          }}
        />
      )}

      {/* 背景处理模式覆盖层 */}
      {isBackgroundMode && beadData && (
        <div style={styles.bgModeOverlay}>
          {/* 顶部提示栏 */}
          <div style={styles.bgModeHeader}>
            <button style={styles.bgModeBackBtn} onClick={handleExitBackgroundMode}>
              <ArrowLeft size={18} weight="bold" />
            </button>
            <span style={styles.bgModeTitle}>背景处理模式</span>
            <span style={styles.bgModeCount}>
              {bgSelectedColorId ? `已选中 ${getBgHighlightedIndices().length} 个网格` : '点击选择背景色'}
            </span>
          </div>

          {/* 图案预览区（背景模式专用） */}
          <div style={styles.bgModePreview}>
            <InteractiveCanvas
              beadData={beadData}
              cellSize={cellSize}
              currentTool="picker" // 背景模式下使用吸色工具的交互方式
              currentColor={null}
              isEditMode={bgViewMode === 'select'} // 只有选择模式才启用编辑交互
              highlightedColorId={bgSelectedColorId} // 高亮选中的颜色
              bgModeHighlightedIndices={getBgHighlightedIndices()} // 背景模式高亮的网格索引
              bgModeExcludedIndices={bgExcludedIndices} // 背景模式排除的网格索引
              isBackgroundMode={true}
              bgViewMode={bgViewMode} // 传递查看/选择模式
              onBgSelectColor={handleBgSelectColor}
              onBgToggleExclude={handleBgToggleExclude}
              onBeadClick={() => {}}
              onBeadDrag={() => {}}
              onDragEnd={() => {}}
              onPickColor={() => {}}
            />
          </div>

          {/* 说明文字 */}
          <div style={styles.bgModeHint}>
            {bgViewMode === 'view' ? (
              <p>查看模式：可拖动浏览图案</p>
            ) : !bgSelectedColorId ? (
              <p>点击任意网格，选择要透明化的颜色</p>
            ) : (
              <p>点击高亮网格可排除，点击已排除网格可恢复</p>
            )}
          </div>

          {/* 底部操作栏 */}
          <div style={styles.bgModeActions}>
            {/* 查看/选择模式切换 */}
            <button
              style={{
                ...styles.bgModeToggleBtn,
                ...(bgViewMode === 'view' ? styles.bgModeToggleBtnActive : {}),
              }}
              onClick={() => setBgViewMode(bgViewMode === 'select' ? 'view' : 'select')}
            >
              {bgViewMode === 'select' ? '查看' : '选择'}
            </button>
            <button
              style={{
                ...styles.bgModeClearBtn,
                opacity: bgSelectedColorId ? 1 : 0.5,
              }}
              onClick={handleBgClearSelection}
              disabled={!bgSelectedColorId}
            >
              重新选择
            </button>
            <button
              style={{
                ...styles.bgModeConfirmBtn,
                opacity: getBgHighlightedIndices().length > 0 ? 1 : 0.5,
              }}
              onClick={handleBgConfirmTransparent}
              disabled={getBgHighlightedIndices().length === 0}
            >
              确认透明 ({getBgHighlightedIndices().length})
            </button>
            <button style={styles.bgModeExitBtn} onClick={handleExitBackgroundMode}>
              退出
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: colors.bg.primary,
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  // Header - 紧凑版 (固定)
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  headerSpacer: {
    height: '50px',
  },

  backBtn: {
    ...mixins.backButton,
  },

  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    background: colors.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },

  // 右侧占位符（移除了下载按钮）
  headerPlaceholder: {
    width: '40px',
    height: '40px',
  },

  // 预览区 - 固定在 header 下方
  previewSection: {
    padding: '8px 12px 6px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
    position: 'sticky',
    top: '50px', // header 高度
    zIndex: 98,
  },

  // 工具栏 - 更紧凑
  toolbarWrapper: {
    padding: '6px 10px',
    background: colors.bg.secondary,
    borderBottom: `1px solid ${colors.border.soft}`,
  },

  // 内容区 - 更紧凑
  content: {
    flex: 'none',
    padding: '8px 12px',
  },

  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    background: colors.bg.card,
    borderRadius: radius.card,
    gap: '12px',
  },

  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `3px solid ${colors.bead.cyan}30`,
    borderTopColor: colors.bead.cyan,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  loadingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    margin: 0,
  },

  // 信息行（尺寸 + 编辑模式按钮）
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
    padding: '0 4px',
  },

  // 尺寸信息
  sizeInfoGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  sizeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  boardRecommendation: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  boardBadge: {
    padding: '2px 6px',
    background: `linear-gradient(135deg, ${colors.bead.cyan}40, ${colors.bead.purple}40)`,
    borderRadius: radius.bead,
    fontSize: '10px',
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
  },

  boardText: {
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
  },

  // 编辑模式按钮 - 更紧凑
  editModeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    padding: '4px 8px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    cursor: 'pointer',
    transition: animation.transition.fast,
    fontSize: '11px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    flexShrink: 0,
  },

  editModeBtnActive: {
    background: `linear-gradient(145deg, ${colors.bead.orange}, ${colors.bead.red})`,
    borderColor: colors.bead.orange,
    color: '#ffffff',
    boxShadow: `0 0 6px ${colors.bead.orange}50`,
  },

  // 浮动编辑按钮 - 预览区左上角
  floatingEditBtn: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.purple})`,
    border: 'none',
    borderRadius: radius.bead,
    color: '#ffffff',
    cursor: 'pointer',
    boxShadow: `0 2px 8px ${colors.bead.cyan}50`,
    zIndex: 10,
    transition: animation.transition.fast,
  },

  // 左侧滑出编辑面板（半透明，自适应高度）
  slidePanel: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    width: '52px',
    background: 'rgba(30, 30, 40, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: radius.card,
    boxShadow: shadows.lg,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 20,
    overflow: 'hidden',
  },

  slidePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderBottom: `1px solid rgba(255,255,255,0.1)`,
  },

  slidePanelTitle: {
    fontSize: '9px',
    fontFamily: typography.fontFamilyAlt,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },

  slidePanelClose: {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: '10px',
    cursor: 'pointer',
  },

  slidePanelTools: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 4px',
    gap: '4px',
  },

  slidePanelColorBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '4px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },

  slidePanelColorPreview: {
    width: '24px',
    height: '24px',
    borderRadius: radius.bead,
    boxShadow: `inset 0 2px 4px rgba(0,0,0,0.2)`,
    border: '2px solid rgba(255,255,255,0.3)',
  },

  slidePanelColorLabel: {
    fontSize: '7px',
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
  },

  slidePanelToolGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '100%',
  },

  slidePanelToolBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
    padding: '4px 2px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: radius.bead,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  slidePanelToolBtnActive: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.bead.cyan}cc)`,
    boxShadow: `0 0 8px ${colors.bead.cyan}50`,
  },

  slidePanelToolIcon: {
    fontSize: '14px',
  },

  slidePanelToolLabel: {
    fontSize: '7px',
    fontFamily: typography.fontFamilyAlt,
    color: '#ffffff',
  },

  slidePanelHistoryGroup: {
    display: 'flex',
    gap: '2px',
    marginTop: '4px',
    justifyContent: 'center',
    width: '100%',
  },

  slidePanelHistoryBtn: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.15)',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    cursor: 'pointer',
  },

  slidePanelMagicBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1px',
    padding: '4px 2px',
    background: `linear-gradient(145deg, ${colors.bead.yellow}, ${colors.bead.orange})`,
    border: 'none',
    borderRadius: radius.bead,
    cursor: 'pointer',
    width: '100%',
  },

  // 控制面板 - 更紧凑
  controlPanel: {
    background: colors.bg.card,
    borderRadius: radius.card,
    padding: '10px',
    marginBottom: '8px',
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border.soft}`,
  },

  controlItem: {
    marginBottom: '8px',
  },

  controlHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },

  controlLabel: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  controlValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
    fontWeight: typography.fontWeight.bold,
  },

  slider: {
    width: '100%',
    height: '6px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: colors.bg.tertiary,
    borderRadius: radius.full,
    outline: 'none',
    cursor: 'pointer',
  },

  performanceWarning: {
    marginTop: '4px',
    padding: '4px 8px',
    background: `${colors.bead.orange}20`,
    borderRadius: radius.bead,
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.orange,
    textAlign: 'center',
  },

  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    fontSize: '9px',
    fontFamily: typography.fontFamilyAlt,
  },

  sliderLabelGreen: {
    color: colors.bead.cyan,
  },

  sliderLabelYellow: {
    color: colors.bead.yellow,
  },

  sliderLabelRed: {
    color: '#ff6b6b',
  },

  colorCountTabs: {
    display: 'flex',
    gap: '6px',
  },

  // 颜色数量选项卡 - 更紧凑
  colorCountTab: {
    flex: 1,
    padding: '6px 2px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    cursor: 'pointer',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    transition: animation.transition.fast,
  },

  colorCountTabActive: {
    background: `linear-gradient(145deg, ${colors.bead.purple}30, ${colors.bead.purple}15)`,
    borderColor: colors.bead.purple,
    color: colors.bead.purple,
  },

  // 颜色合并滑块样式
  mergeSliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  mergeLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    whiteSpace: 'nowrap',
  },

  mergeHint: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    margin: '6px 0 0',
    textAlign: 'center',
  },

  // 统计区域 - 更紧凑
  statsSection: {
    background: colors.bg.card,
    borderRadius: radius.card,
    marginBottom: '8px',
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border.soft}`,
    overflow: 'hidden',
  },

  statsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },

  statsHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  statsHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  smartMergeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: `linear-gradient(145deg, ${colors.bead.purple}20, ${colors.bead.purple}10)`,
    border: `1px solid ${colors.bead.purple}50`,
    borderRadius: radius.button,
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.purple,
    transition: animation.transition.fast,
  },

  shoppingListBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: `linear-gradient(145deg, ${colors.bead.green}20, ${colors.bead.green}10)`,
    border: `1px solid ${colors.bead.green}50`,
    borderRadius: radius.button,
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.green,
    transition: animation.transition.fast,
  },

  statsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
  },

  statsCount: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    padding: '2px 8px',
    background: colors.bg.tertiary,
    borderRadius: radius.full,
  },

  statsArrow: {
    fontSize: '10px',
    color: colors.text.muted,
    transition: animation.transition.fast,
  },

  // 统计列表 - 更紧凑
  statsList: {
    padding: '0 8px 8px',
    maxHeight: '140px',
    overflowY: 'auto',
  },

  statsItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 0',
    borderBottom: `1px solid ${colors.border.soft}`,
    cursor: 'pointer',
    transition: animation.transition.fast,
  },

  // 高亮选中的颜色行
  statsItemHighlighted: {
    background: `linear-gradient(145deg, ${colors.bead.yellow}20, ${colors.bead.yellow}10)`,
    borderColor: colors.bead.yellow,
    borderRadius: '4px',
    padding: '4px 4px',
    margin: '0 -4px',
  },

  statsRank: {
    width: '16px',
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    textAlign: 'center',
  },

  // 颜色块 - 更小
  statsColorBox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    flexShrink: 0,
  },

  // 色号
  statsColorId: {
    fontSize: '9px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    minWidth: '26px',
    flexShrink: 0,
  },

  statsColorName: {
    flex: 1,
    fontSize: '11px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  statsColorCount: {
    fontSize: '11px',
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.primary,
    minWidth: '28px',
    textAlign: 'right',
  },

  statsColorPercent: {
    fontSize: '10px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
    minWidth: '32px',
    textAlign: 'right',
  },

  // 替换按钮样式 - 更小
  replaceBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 6px',
    marginLeft: '2px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}20, ${colors.bead.cyan}10)`,
    border: `1px solid ${colors.bead.cyan}50`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.cyan,
    transition: animation.transition.fast,
    whiteSpace: 'nowrap',
  },

  // 还原按钮样式 - 更小
  restoreBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 6px',
    marginLeft: '2px',
    background: `linear-gradient(145deg, ${colors.bead.orange}20, ${colors.bead.orange}10)`,
    border: `1px solid ${colors.bead.orange}50`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.orange,
    transition: animation.transition.fast,
    whiteSpace: 'nowrap',
  },

  // 还原全部按钮
  restoreAllBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '6px',
    marginTop: '6px',
    background: `linear-gradient(145deg, ${colors.bead.purple}20, ${colors.bead.purple}10)`,
    border: `1px solid ${colors.bead.purple}50`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.purple,
    transition: animation.transition.fast,
  },

  // 排除按钮样式
  excludeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 4px',
    marginLeft: '2px',
    background: 'transparent',
    border: `1px solid ${colors.text.muted}30`,
    borderRadius: '4px',
    cursor: 'pointer',
    color: colors.text.muted,
    transition: animation.transition.fast,
  },

  excludeBtnActive: {
    background: `linear-gradient(145deg, ${colors.bead.red}20, ${colors.bead.red}10)`,
    border: `1px solid ${colors.bead.red}50`,
    color: colors.bead.red,
  },

  // 排除提示
  excludeHint: {
    width: '100%',
    padding: '6px 8px',
    marginTop: '6px',
    background: `${colors.bead.red}10`,
    borderRadius: '6px',
    fontSize: '11px',
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.red,
    textAlign: 'center',
  },

  // 操作按钮区 - 更紧凑
  actions: {
    display: 'flex',
    gap: '6px',
    paddingBottom: '12px',
  },

  secondaryBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 6px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: shadows.sm,
    transition: animation.transition.fast,
  },

  primaryBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 6px',
    background: `linear-gradient(145deg, ${colors.bead.cyan}, ${colors.pixel.blue})`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: `${shadows.button}, ${shadows.glow.cyan}`,
    transition: animation.transition.fast,
  },

  // ========== 背景处理模式样式 ==========
  bgModeOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: colors.bg.primary,
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
  },

  bgModeHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: `linear-gradient(145deg, ${colors.bead.magenta}20, ${colors.bead.purple}20)`,
    borderBottom: `1px solid ${colors.bead.magenta}40`,
    gap: '12px',
  },

  bgModeBackBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: colors.bg.card,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.primary,
    cursor: 'pointer',
  },

  bgModeTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    fontFamily: typography.fontFamilyAlt,
    color: colors.bead.magenta,
  },

  bgModeCount: {
    marginLeft: 'auto',
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.secondary,
    padding: '4px 10px',
    background: colors.bg.card,
    borderRadius: radius.full,
  },

  bgModePreview: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    overflow: 'auto',
  },

  bgModeHint: {
    padding: '8px 16px',
    background: colors.bg.secondary,
    borderTop: `1px solid ${colors.border.soft}`,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamilyAlt,
    color: colors.text.muted,
  },

  bgModeActions: {
    display: 'flex',
    gap: '6px',
    padding: '12px 16px',
    background: colors.bg.secondary,
    borderTop: `1px solid ${colors.border.soft}`,
  },

  bgModeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 14px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    flexShrink: 0,
  },

  bgModeToggleBtnActive: {
    background: `linear-gradient(145deg, ${colors.bead.cyan}30, ${colors.bead.cyan}10)`,
    borderColor: colors.bead.cyan,
    color: colors.bead.cyan,
  },

  bgModeClearBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
  },

  bgModeConfirmBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    background: `linear-gradient(145deg, ${colors.bead.magenta}, ${colors.bead.purple})`,
    border: 'none',
    borderRadius: radius.button,
    color: '#ffffff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
    boxShadow: shadows.button,
  },

  bgModeExitBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    background: colors.bg.tertiary,
    border: `1px solid ${colors.border.soft}`,
    borderRadius: radius.button,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamilyAlt,
    cursor: 'pointer',
  },
};

// CSS动画
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('#editor-styles')) {
  styleSheet.id = 'editor-styles';
  document.head.appendChild(styleSheet);
}

export default EditorPage;
