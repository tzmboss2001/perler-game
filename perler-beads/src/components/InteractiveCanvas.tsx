/**
 * 浜や簰寮廋anvas缁勪欢
 * 鏀寔瑙︽懜鍜岄紶鏍囨搷浣滐紝鐢ㄤ簬缂栬緫鐝犲瓙鍥炬
 */

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle } from 'react';
import { BeadPixelData, renderBeadsToCanvas } from '../services/colorMatchService';
import { BeadColor } from '../data/beadColors';
import { EditorTool } from '../store/editorStore';
import { colors, radius, shadows } from '../styles/designSystem';

interface InteractiveCanvasProps {
  beadData: BeadPixelData;
  cellSize: number;
  currentTool: EditorTool;
  currentColor: BeadColor | null;
  isEditMode: boolean; // 鏄惁澶勪簬缂栬緫妯″紡
  highlightedColorId: string | null; // 楂樹寒鏄剧ず鐨勯鑹睮D
  onBeadClick: (x: number, y: number) => void;
  onBeadDrag: (x: number, y: number) => void;
  onDragEnd: () => void;
  onPickColor: (color: BeadColor) => void;
  // 鑳屾櫙澶勭悊妯″紡鐩稿叧
  isBackgroundMode?: boolean; // 鏄惁澶勪簬鑳屾櫙澶勭悊妯″紡
  bgModeHighlightedIndices?: number[]; // 鑳屾櫙妯″紡楂樹寒鐨勭綉鏍肩储寮?
  bgModeExcludedIndices?: Set<number>; // 鑳屾櫙妯″紡鎺掗櫎鐨勭綉鏍肩储寮?
  bgModeRecoverableIndices?: Set<number>;
  bgCandidateOnly?: boolean;
  bgViewMode?: 'select' | 'view' | 'erase' | 'restore'; // 鑳屾櫙妯″紡浜や簰鏂瑰紡
  onBgSelectColor?: (index: number) => void; // 鑳屾櫙妯″紡閫夋嫨棰滆壊
  onBgToggleExclude?: (index: number) => void; // 鑳屾櫙妯″紡鍒囨崲鎺掗櫎
  onBgRestoreCell?: (index: number) => void;
  onBgManualErase?: (index: number) => void;
  // 澶х綉鏍肩嚎
  showMajorGrid?: boolean; // major grid lines
  showControls?: boolean;
  onScaleChange?: (payload: { scale: number; minScale: number; maxScale: number; fitScale: number }) => void;
}

export interface InteractiveCanvasHandle {
  zoomOut: () => void;
  zoomIn: () => void;
  fitToViewport: () => void;
  resetToActualSize: () => void;
  setZoomPercent: (value: number) => void;
}

const InteractiveCanvas = React.forwardRef<InteractiveCanvasHandle, InteractiveCanvasProps>(({
  beadData,
  cellSize,
  currentTool,
  currentColor,
  isEditMode,
  highlightedColorId,
  onBeadClick,
  onBeadDrag,
  onDragEnd,
  onPickColor,
  // 鑳屾櫙澶勭悊妯″紡
  isBackgroundMode = false,
  bgModeHighlightedIndices = [],
  bgModeExcludedIndices = new Set(),
  bgModeRecoverableIndices = new Set(),
  bgCandidateOnly = false,
  bgViewMode = 'select',
  onBgSelectColor,
  onBgToggleExclude,
  onBgRestoreCell,
  onBgManualErase,
  // 澶х綉鏍肩嚎
  showMajorGrid = false,
  showControls = true,
  onScaleChange,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastCell, setLastCell] = useState<{ x: number; y: number } | null>(null);

  // 缂╂斁鍜屽钩绉荤姸鎬?
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false); // 鏄惁宸插垵濮嬪寲閫傞厤缂╂斁
  const previousPatternSizeRef = useRef<{ width: number; height: number } | null>(null);
  const lastFitScaleRef = useRef(1);
  const previousCanvasMetricsRef = useRef<{ width: number; height: number; scale: number } | null>(null);

  // 鍙屾寚缂╂斁鐘舵€?
  const [isPinching, setIsPinching] = useState(false);
  const pinchStartDistance = useRef<number>(0);
  const pinchStartScale = useRef<number>(1);
  const ABSOLUTE_MIN_SCALE = 0.1;
  const ABSOLUTE_MAX_SCALE = 6;

  // 璁＄畻閫傞厤棰勮鍖虹殑缂╂斁姣斾緥
  const calculateFitScaleForSize = useCallback((patternWidth: number, patternHeight: number) => {
    if (!containerRef.current) return 1;

    // 瀹瑰櫒鍙敤灏哄锛堝噺鍘?padding锛?
    const containerWidth = containerRef.current.clientWidth - 8; // padding: 4px * 2
    const containerHeight = containerRef.current.clientHeight - 8;

    // 鍥剧墖鍘熷灏哄
    const imageWidth = patternWidth * cellSize;
    const imageHeight = patternHeight * cellSize;

    // 璁＄畻姘村钩鍜屽瀭鐩存柟鍚戠殑缂╂斁姣斾緥
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;

    // 妯浘浼樺厛閫傞厤瀹藉害锛岀珫鍥句紭鍏堥€傞厤楂樺害
    const preferWidth = imageWidth >= imageHeight;
    let fitScale = preferWidth ? scaleX : scaleY;

    // 闄愬埗鍦ㄥ悎鐞嗚寖鍥村唴
    fitScale = Math.max(ABSOLUTE_MIN_SCALE, Math.min(ABSOLUTE_MAX_SCALE, fitScale));

    return fitScale;
  }, [cellSize]);

  const calculateFitScale = useCallback(() => {
    if (!beadData) return 1;
    return calculateFitScaleForSize(beadData.width, beadData.height);
  }, [beadData, calculateFitScaleForSize]);

  const getScaleBounds = useCallback(() => {
    const fitScale = calculateFitScale();
    const isTinyPattern = beadData.width <= 24 && beadData.height <= 24;
    const minScale = Math.max(ABSOLUTE_MIN_SCALE, fitScale * 0.8);
    const fitBasedMaxScale = Math.min(ABSOLUTE_MAX_SCALE, fitScale * (isTinyPattern ? 2.5 : 2));
    const maxScale = Math.max(1, fitBasedMaxScale);

    return {
      fitScale,
      minScale,
      maxScale: Math.max(minScale, maxScale),
    };
  }, [beadData.height, beadData.width, calculateFitScale]);

  const clampScale = useCallback((value: number) => {
    const { minScale, maxScale } = getScaleBounds();
    return Math.min(maxScale, Math.max(minScale, value));
  }, [getScaleBounds]);

  const zoomOut = useCallback(() => {
    setScale((current) => clampScale(current - 0.1));
  }, [clampScale]);

  const zoomIn = useCallback(() => {
    setScale((current) => clampScale(current + 0.1));
  }, [clampScale]);

  const fitToViewport = useCallback(() => {
    setScale(getScaleBounds().fitScale);
  }, [getScaleBounds]);

  const resetToActualSize = useCallback(() => {
    setScale(clampScale(1));
  }, [clampScale]);

  const setZoomPercent = useCallback((value: number) => {
    setScale(clampScale(value / 100));
  }, [clampScale]);

  useImperativeHandle(ref, () => ({
    zoomOut,
    zoomIn,
    fitToViewport,
    resetToActualSize,
    setZoomPercent,
  }), [fitToViewport, resetToActualSize, setZoomPercent, zoomIn, zoomOut]);

  const syncScaleToViewport = useCallback((options?: { forceFit?: boolean; patternChanged?: boolean }) => {
    if (!beadData || !containerRef.current) return;

    const { fitScale, minScale, maxScale } = getScaleBounds();
    const previousFitScale = lastFitScaleRef.current;
    const forceFit = options?.forceFit ?? false;
    const patternChanged = options?.patternChanged ?? false;

    setScale((currentScale) => {
      if (forceFit || !isInitialized) {
        return fitScale;
      }

      const wasNearFit = Math.abs(currentScale - previousFitScale) < 0.02;
      if (wasNearFit) {
        return fitScale;
      }

      if (patternChanged && Number.isFinite(previousFitScale) && previousFitScale > 0) {
        const zoomRatio = currentScale / previousFitScale;
        const targetScale = fitScale * zoomRatio;
        return Math.min(maxScale, Math.max(minScale, targetScale));
      }

      return Math.min(maxScale, Math.max(minScale, currentScale));
    });

    lastFitScaleRef.current = fitScale;
    previousPatternSizeRef.current = { width: beadData.width, height: beadData.height };
    setIsInitialized(true);
  }, [beadData, getScaleBounds, isInitialized]);

  // beadData 鍙樺寲鏃讹紝閲嶆柊璁＄畻骞惰缃€傞厤缂╂斁
  useEffect(() => {
    if (!beadData || !containerRef.current) return;
    requestAnimationFrame(() => {
      const previousPatternSize = previousPatternSizeRef.current;
      const patternChanged =
        !previousPatternSize ||
        previousPatternSize.width !== beadData.width ||
        previousPatternSize.height !== beadData.height;
      syncScaleToViewport({ forceFit: !isInitialized, patternChanged });
    });
  }, [beadData?.width, beadData?.height, isInitialized, syncScaleToViewport]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      if (entry.contentRect.width <= 0 || entry.contentRect.height <= 0) return;
      syncScaleToViewport({ forceFit: !isInitialized, patternChanged: false });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isInitialized, syncScaleToViewport]);

  useEffect(() => {
    const bounds = getScaleBounds();
    onScaleChange?.({
      scale,
      minScale: bounds.minScale,
      maxScale: bounds.maxScale,
      fitScale: bounds.fitScale,
    });
  }, [getScaleBounds, onScaleChange, scale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !beadData) return;

    const nextMetrics = {
      width: beadData.width * scaledCellSize,
      height: beadData.height * scaledCellSize,
      scale,
    };
    const previousMetrics = previousCanvasMetricsRef.current;

    requestAnimationFrame(() => {
      if (!containerRef.current) return;

      const currentContainer = containerRef.current;
      const viewportWidth = currentContainer.clientWidth;
      const viewportHeight = currentContainer.clientHeight;

      if (!previousMetrics) {
        currentContainer.scrollLeft = Math.max(0, (nextMetrics.width - viewportWidth) / 2);
        currentContainer.scrollTop = Math.max(0, (nextMetrics.height - viewportHeight) / 2);
        previousCanvasMetricsRef.current = nextMetrics;
        return;
      }

      const centerX = currentContainer.scrollLeft + viewportWidth / 2;
      const centerY = currentContainer.scrollTop + viewportHeight / 2;
      const relativeCenterX = previousMetrics.width > 0 ? centerX / previousMetrics.width : 0.5;
      const relativeCenterY = previousMetrics.height > 0 ? centerY / previousMetrics.height : 0.5;

      currentContainer.scrollLeft = Math.max(0, nextMetrics.width * relativeCenterX - viewportWidth / 2);
      currentContainer.scrollTop = Math.max(0, nextMetrics.height * relativeCenterY - viewportHeight / 2);
      previousCanvasMetricsRef.current = nextMetrics;
    });
  }, [beadData, scaledCellSize, scale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const preventBrowserPinchZoom = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
      }
    };

    const preventGestureZoom = (event: Event) => {
      event.preventDefault();
    };

    container.addEventListener('touchstart', preventBrowserPinchZoom, { passive: false });
    container.addEventListener('touchmove', preventBrowserPinchZoom, { passive: false });
    container.addEventListener('gesturestart', preventGestureZoom as EventListener);
    container.addEventListener('gesturechange', preventGestureZoom as EventListener);

    return () => {
      container.removeEventListener('touchstart', preventBrowserPinchZoom);
      container.removeEventListener('touchmove', preventBrowserPinchZoom);
      container.removeEventListener('gesturestart', preventGestureZoom as EventListener);
      container.removeEventListener('gesturechange', preventGestureZoom as EventListener);
    };
  }, []);

  // 璁＄畻瀹為檯娓叉煋鐨?cellSize锛堣€冭檻缂╂斁锛?
  const scaledCellSize = Math.round(cellSize * scale);

  // 娓叉煋Canvas锛堝寘鍚珮浜晥鏋滐級- 浣跨敤瀹為檯鍒嗚鲸鐜囨覆鏌擄紝纭繚鏀惧ぇ鏃舵竻鏅?
  useEffect(() => {
    if (canvasRef.current && beadData) {
      // 浣跨敤缂╂斁鍚庣殑 cellSize 娓叉煋锛岀‘淇濇斁澶ф椂鏂囧瓧娓呮櫚
      renderBeadsToCanvas(beadData, canvasRef.current, scaledCellSize, true, false, showMajorGrid);

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // 鑳屾櫙澶勭悊妯″紡鐨勬覆鏌?
      if (isBackgroundMode) {
        const highlightedSet = new Set(bgModeHighlightedIndices);

        for (let y = 0; y < beadData.height; y++) {
          for (let x = 0; x < beadData.width; x++) {
            const index = y * beadData.width + x;
            const bead = beadData.beads[index];
            const px = x * scaledCellSize;
            const py = y * scaledCellSize;
            const isRecoverable = !bead && bgModeRecoverableIndices.has(index);

            if (bgCandidateOnly && !highlightedSet.has(index) && !bgModeExcludedIndices.has(index) && !isRecoverable) {
              ctx.fillStyle = 'rgba(8, 12, 24, 0.72)';
              ctx.fillRect(px, py, scaledCellSize, scaledCellSize);
            }

            if (highlightedSet.has(index)) {
              // 已选背景区域改用更轻的透明棋盘格提示，避免误解成“变成绿色/变成实色”
              const checkerSize = Math.max(2, Math.floor(scaledCellSize / 3));
              for (let cy = 0; cy < scaledCellSize; cy += checkerSize) {
                for (let cx = 0; cx < scaledCellSize; cx += checkerSize) {
                  const useLightTile = ((Math.floor(cx / checkerSize) + Math.floor(cy / checkerSize)) % 2) === 0;
                  ctx.fillStyle = useLightTile ? 'rgba(255, 255, 255, 0.18)' : 'rgba(12, 18, 32, 0.14)';
                  ctx.fillRect(px + cx, py + cy, Math.min(checkerSize, scaledCellSize - cx), Math.min(checkerSize, scaledCellSize - cy));
                }
              }
              ctx.strokeStyle = '#8BE9FD';
              ctx.lineWidth = Math.max(1.5, scale * 0.9);
              ctx.strokeRect(px + 1, py + 1, scaledCellSize - 2, scaledCellSize - 2);
            } else if (bgModeExcludedIndices.has(index) && bead && bead.id === highlightedColorId) {
              // 被排除保留的区域使用更温和的青色虚线边框
              ctx.strokeStyle = '#67E8F9';
              ctx.lineWidth = Math.max(2, scale);
              ctx.setLineDash([3, 2]);
              ctx.strokeRect(px + 1, py + 1, scaledCellSize - 2, scaledCellSize - 2);
              ctx.setLineDash([]);
            } else if (isRecoverable) {
              ctx.strokeStyle = '#FBBF24';
              ctx.lineWidth = Math.max(1.5, scale * 0.8);
              ctx.setLineDash([4, 3]);
              ctx.strokeRect(px + 2, py + 2, scaledCellSize - 4, scaledCellSize - 4);
              ctx.setLineDash([]);
            }
          }
        }
      } else if (highlightedColorId) {
        // 鏅€氭ā寮忕殑楂樹寒鏁堟灉
        // 閬嶅巻鎵€鏈夌彔瀛愶紝涓哄尮閰嶇殑棰滆壊缁樺埗楂樹寒杈规
        for (let y = 0; y < beadData.height; y++) {
          for (let x = 0; x < beadData.width; x++) {
            const index = y * beadData.width + x;
            const bead = beadData.beads[index];
            if (bead && bead.id === highlightedColorId) {  // 璺宠繃閫忔槑鐝犲瓙
              const px = x * scaledCellSize;
              const py = y * scaledCellSize;
              // 缁樺埗楂樹寒杈规
              ctx.strokeStyle = '#FFD700'; // 閲戣壊杈规
              ctx.lineWidth = Math.max(2, scale);
              ctx.strokeRect(px + 1, py + 1, scaledCellSize - 2, scaledCellSize - 2);
            }
          }
        }
      }
    }
  }, [beadData, cellSize, scale, scaledCellSize, highlightedColorId, isBackgroundMode, bgModeHighlightedIndices, bgModeExcludedIndices, bgModeRecoverableIndices, bgCandidateOnly]);

  // 鑾峰彇Canvas鐩稿鍧愭爣锛堣€冭檻缂╂斁锛?
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    // Canvas 鐜板湪鏄疄闄呭垎杈ㄧ巼锛宺ect 鍜?canvas 灏哄涓€鑷?
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 浣跨敤缂╂斁鍚庣殑 cellSize 璁＄畻缃戞牸鍧愭爣
    const cellX = Math.floor(x / scaledCellSize);
    const cellY = Math.floor(y / scaledCellSize);

    if (cellX >= 0 && cellX < beadData.width && cellY >= 0 && cellY < beadData.height) {
      return { x: cellX, y: cellY };
    }
    return null;
  }, [beadData, scaledCellSize]);

  // 澶勭悊鐐瑰嚮/瑙︽懜寮€濮嬶紙浠呭湪缂栬緫妯″紡涓嬶級
  const handleStart = useCallback((clientX: number, clientY: number, isTouch: boolean = false) => {
    // 闈炵紪杈戞ā寮忎笅涓嶅鐞嗭紝璁╂祻瑙堝櫒澶勭悊婊氬姩
    if (!isEditMode) return;

    const coords = getCanvasCoords(clientX, clientY);
    if (!coords) return;

    const index = coords.y * beadData.width + coords.x;

    // 鑳屾櫙澶勭悊妯″紡鐨勭偣鍑诲鐞?
    if (isBackgroundMode) {
      const bead = beadData.beads[index];

      if (bgViewMode === 'restore') {
        if (!bead && onBgRestoreCell) {
          onBgRestoreCell(index);
        }
        return;
      }

      if (bgViewMode === 'erase') {
        if (bead && onBgManualErase) {
          onBgManualErase(index);
        }
        return;
      }

      if (!bead && bgModeRecoverableIndices.has(index) && onBgRestoreCell) {
        onBgRestoreCell(index);
        return;
      }

      // 濡傛灉杩樻病閫夋嫨棰滆壊锛岀偣鍑讳换鎰忛潪閫忔槑缃戞牸閫夋嫨璇ラ鑹?
      if (!highlightedColorId) {
        if (bead && onBgSelectColor) {
          onBgSelectColor(index);
        }
        return;
      }

      // 手动选背景模式下，点到其他未高亮格子时，允许直接重新选择新的连通区域。
      if (bgViewMode === 'select' && bead && onBgSelectColor) {
        const highlightedSet = new Set(bgModeHighlightedIndices);
        const isSelectableNewSeed = !highlightedSet.has(index) && !bgModeExcludedIndices.has(index);
        if (isSelectableNewSeed) {
          onBgSelectColor(index);
          return;
        }
      }

      // 宸查€夋嫨棰滆壊锛岀偣鍑婚珮浜綉鏍兼垨鍚岃壊缃戞牸杩涜鎺掗櫎/鎭㈠
      const highlightedSet = new Set(bgModeHighlightedIndices);
      if (highlightedSet.has(index) || (bead && bead.id === highlightedColorId && bgModeExcludedIndices.has(index))) {
        // 鐐瑰嚮楂樹寒鐨勭綉鏍?-> 鎺掗櫎瀹?
        // 鐐瑰嚮宸叉帓闄ょ殑鍚岃壊缃戞牸 -> 鎭㈠瀹?
        if (onBgToggleExclude) {
          onBgToggleExclude(index);
        }
      }
      return;
    }

    // 姝ｅ父妯″紡鐨勭偣鍑诲鐞?
    if (currentTool === 'picker') {
      // 鍚歌壊宸ュ叿
      const color = beadData.beads[index];
      if (color) onPickColor(color);  // 閫忔槑鐝犲瓙涓嶅惛鑹?
    } else if (currentTool === 'fill') {
      // 濉厖宸ュ叿 - 鍙湪鐐瑰嚮鏃舵墽琛?
      onBeadClick(coords.x, coords.y);
    } else {
      // 鐢荤瑪/姗＄毊 - 鏀寔鎷栧姩
      setIsDragging(true);
      setLastCell(coords);
      onBeadClick(coords.x, coords.y);
    }
  }, [beadData, currentTool, getCanvasCoords, onBeadClick, onPickColor, isEditMode, isBackgroundMode, highlightedColorId, bgModeHighlightedIndices, bgModeExcludedIndices, bgModeRecoverableIndices, bgViewMode, onBgSelectColor, onBgToggleExclude, onBgRestoreCell, onBgManualErase]);

  // 澶勭悊绉诲姩锛堟嫋鍔ㄧ粯鍒讹級
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || currentTool === 'fill' || currentTool === 'picker') return;

    const coords = getCanvasCoords(clientX, clientY);
    if (!coords) return;

    // 閬垮厤閲嶅缁樺埗鍚屼竴涓牸瀛?
    if (lastCell && coords.x === lastCell.x && coords.y === lastCell.y) return;

    setLastCell(coords);
    onBeadDrag(coords.x, coords.y);
  }, [isDragging, currentTool, getCanvasCoords, lastCell, onBeadDrag]);

  // 澶勭悊缁撴潫
  const handleEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setLastCell(null);
      onDragEnd();
    }
  }, [isDragging, onDragEnd]);

  // 榧犳爣浜嬩欢
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // 宸﹂敭
      handleStart(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleMouseLeave = () => {
    handleEnd();
  };

  // 璁＄畻涓や釜瑙︽懜鐐逛箣闂寸殑璺濈
  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 瑙︽懜浜嬩欢
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, true);
    } else if (e.touches.length === 2) {
      // 鍙屾寚 - 寮€濮嬬缉鏀?
      e.preventDefault(); // 闃绘娴忚鍣ㄩ粯璁ょ缉鏀?
      setIsDragging(false);
      setIsPinching(true);
      pinchStartDistance.current = getTouchDistance(e.touches);
      pinchStartScale.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2 && isPinching) {
      // 鍙屾寚缂╂斁
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scaleRatio = currentDistance / pinchStartDistance.current;
      const { minScale, maxScale } = getScaleBounds();
      let newScale = pinchStartScale.current * scaleRatio;
      // 闄愬埗缂╂斁鑼冨洿
      newScale = Math.max(minScale, Math.min(maxScale, newScale));
      setScale(newScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // 濡傛灉杩樻湁涓€涓墜鎸囧湪灞忓箷涓婏紝涓嶇粨鏉熺缉鏀剧姸鎬?
    if (e.touches.length < 2) {
      setIsPinching(false);
    }
    if (e.touches.length === 0) {
      handleEnd();
    }
  };

  // 宸ュ叿鍏夋爣
  const getCursor = () => {
    // 鑳屾櫙妯″紡鏌ョ湅鏃舵樉绀烘姄鎵?
    if (isBackgroundMode && bgViewMode === 'view') {
      return 'grab';
    }
    // 鑳屾櫙妯″紡閫夋嫨鏃舵樉绀哄崄瀛?
    if (isBackgroundMode) {
      return 'crosshair';
    }
    switch (currentTool) {
      case 'brush':
        return 'crosshair';
      case 'fill':
        return 'cell';
      case 'eraser':
        return 'crosshair';
      case 'picker':
        return 'copy';
      default:
        return 'default';
    }
  };

  // Canvas 浣跨敤瀹為檯缂╂斁鍚庣殑灏哄锛堥珮鍒嗚鲸鐜囨覆鏌擄級
  const canvasWidth = beadData.width * scaledCellSize;
  const canvasHeight = beadData.height * scaledCellSize;

  return (
    <div style={styles.wrapper}>
      {/* Canvas 瀹瑰櫒 */}
      <div
        ref={containerRef}
        style={{
          ...styles.container,
          cursor: getCursor(),
        }}
      >
        {/* 缂╂斁瀹瑰櫒 - 璁剧疆瀹為檯灏哄浠ユ敮鎸佹粴鍔紝灏忓浘鏃跺眳涓樉绀?*/}
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            minWidth: canvasWidth,
            minHeight: canvasHeight,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            margin: 'auto', // 灏忓浘鏃跺眳涓樉绀?
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              ...styles.canvas,
              // Canvas 灏哄涓庡疄闄呭儚绱犱竴鑷达紝涓嶄娇鐢?CSS 缂╂斁锛岀‘淇濇竻鏅板害
              width: canvasWidth,
              height: canvasHeight,
              // 缂栬緫妯″紡涓嬮樆姝㈡粴鍔紝娴忚妯″紡涓嬪厑璁告粴鍔?
              // 鑳屾櫙妯″紡鏌ョ湅鏃朵篃鍏佽婊氬姩
              // 娉ㄦ剰锛氬弻鎸囩缉鏀鹃€氳繃 e.preventDefault() 鍦ㄤ簨浠跺鐞嗕腑闃绘
              touchAction: (isEditMode && !(isBackgroundMode && bgViewMode === 'view')) ? 'none' : 'pan-x pan-y',
              cursor: getCursor(),
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </div>

      {/* 缂╂斁鎺у埗 - 鍥哄畾鍦ㄥ灞傚簳閮?*/}
      {showControls && <div style={styles.zoomControls}>
        <button
          style={styles.zoomButton}
          onClick={zoomOut}
        >
          -
        </button>
        <input
          type="range"
          min={Math.round(getScaleBounds().minScale * 100)}
          max={Math.round(getScaleBounds().maxScale * 100)}
          value={Math.round(scale * 100)}
          onChange={(e) => setZoomPercent(Number(e.target.value))}
          style={styles.zoomSlider}
        />
        <span style={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button
          style={styles.zoomButton}
          onClick={zoomIn}
        >
          +
        </button>
        <button
          style={styles.zoomButton}
          onClick={fitToViewport}
          title="适配预览区"
        >
          适配
        </button>
        <button
          style={styles.zoomButton}
          onClick={resetToActualSize}
        >
          1:1
        </button>
      </div>}
    </div>
  );
});

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },

  container: {
    position: 'relative',
    width: '100%',
    height: '52vh',
    minHeight: '320px',
    maxHeight: '58vh',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `2px solid ${colors.bead.cyan}40`,
    padding: '4px', // 鏈€灏?padding锛岃鍥剧墖灏藉彲鑳藉ぇ
    display: 'flex', // 鏀逛负 flex 甯冨眬鏀寔鍨傜洿灞呬腑
    alignItems: 'center', // 鍨傜洿灞呬腑
    justifyContent: 'center', // 姘村钩灞呬腑
    overflow: 'auto', // 鍏佽婊氬姩鏌ョ湅鏀惧ぇ鍚庣殑鍥剧墖
    boxShadow: shadows.md,
    WebkitOverflowScrolling: 'touch', // iOS 骞虫粦婊氬姩
  },

  canvas: {
    imageRendering: 'pixelated',
    borderRadius: radius.bead,
    boxShadow: shadows.sm,
  },

  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: colors.bg.tertiary,
    borderRadius: radius.button,
  },

  zoomButton: {
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: radius.bead,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },

  zoomLabel: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ffffff',
    minWidth: '40px',
    textAlign: 'center',
  },

  zoomSlider: {
    width: '60px',
    height: '4px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  },
};

export default InteractiveCanvas;

