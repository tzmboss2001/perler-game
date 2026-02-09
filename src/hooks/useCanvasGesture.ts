/**
 * Canvas 手势处理 Hook
 * 支持：缩放、平移、点击放置
 */

import { useRef, useCallback, useEffect } from 'react';

interface GestureState {
  // 视图变换
  offsetX: number;
  offsetY: number;
  scale: number;
  // 内部状态
  isPanning: boolean;
  isDrawing: boolean;
  lastPanX: number;
  lastPanY: number;
  lastPinchDist: number;
  drawStartTime: number;
}

interface UseCanvasGestureOptions {
  minScale?: number;
  maxScale?: number;
  onCellTap?: (cellX: number, cellY: number) => void;
  onCellDrag?: (cellX: number, cellY: number) => void;
  onCellLongPress?: (cellX: number, cellY: number) => void;
  onViewChange?: (offsetX: number, offsetY: number, scale: number) => void;
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
}

export function useCanvasGesture(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UseCanvasGestureOptions,
) {
  const {
    minScale = 0.5,
    maxScale = 4,
    onCellTap,
    onCellDrag,
    onCellLongPress,
    onViewChange,
    cellSize,
    boardWidth,
    boardHeight,
  } = options;

  const stateRef = useRef<GestureState>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    isPanning: false,
    isDrawing: false,
    lastPanX: 0,
    lastPanY: 0,
    lastPinchDist: 0,
    drawStartTime: 0,
  });

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDrawCellRef = useRef<string>('');

  // 屏幕坐标 → 网格坐标
  const screenToCell = useCallback((screenX: number, screenY: number) => {
    const s = stateRef.current;
    const worldX = (screenX - s.offsetX) / s.scale;
    const worldY = (screenY - s.offsetY) / s.scale;
    const cellX = Math.floor(worldX / cellSize);
    const cellY = Math.floor(worldY / cellSize);
    return { cellX, cellY };
  }, [cellSize]);

  const isValidCell = useCallback((cellX: number, cellY: number) => {
    return cellX >= 0 && cellX < boardWidth && cellY >= 0 && cellY < boardHeight;
  }, [boardWidth, boardHeight]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // 居中画布
  const centerView = useCallback((containerWidth: number, containerHeight: number) => {
    const totalWidth = boardWidth * cellSize;
    const totalHeight = boardHeight * cellSize;
    const scaleX = containerWidth / totalWidth;
    const scaleY = containerHeight / totalHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 留10%边距
    const clampedScale = Math.max(minScale, Math.min(maxScale, scale));
    const offsetX = (containerWidth - totalWidth * clampedScale) / 2;
    const offsetY = (containerHeight - totalHeight * clampedScale) / 2;
    stateRef.current.scale = clampedScale;
    stateRef.current.offsetX = offsetX;
    stateRef.current.offsetY = offsetY;
    onViewChange?.(offsetX, offsetY, clampedScale);
  }, [boardWidth, boardHeight, cellSize, minScale, maxScale, onViewChange]);

  // 触摸事件处理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getTouch = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    const getPinchDist = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;

      if (e.touches.length === 2) {
        // 双指：缩放模式
        s.isPanning = true;
        s.isDrawing = false;
        s.lastPinchDist = getPinchDist(e);
        clearLongPress();
        return;
      }

      if (e.touches.length === 1) {
        const { x, y } = getTouch(e);
        const { cellX, cellY } = screenToCell(x, y);
        s.isDrawing = true;
        s.isPanning = false;
        s.lastPanX = x;
        s.lastPanY = y;
        s.drawStartTime = Date.now();
        lastDrawCellRef.current = '';

        // 长按检测
        clearLongPress();
        longPressTimerRef.current = setTimeout(() => {
          if (s.isDrawing && isValidCell(cellX, cellY)) {
            onCellLongPress?.(cellX, cellY);
            s.isDrawing = false;
          }
        }, 500);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;

      if (e.touches.length === 2 && s.isPanning) {
        // 双指缩放
        const newDist = getPinchDist(e);
        const ratio = newDist / s.lastPinchDist;
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = canvas.getBoundingClientRect();
        const cx = midX - rect.left;
        const cy = midY - rect.top;

        const newScale = Math.max(minScale, Math.min(maxScale, s.scale * ratio));
        const scaleChange = newScale / s.scale;
        s.offsetX = cx - (cx - s.offsetX) * scaleChange;
        s.offsetY = cy - (cy - s.offsetY) * scaleChange;
        s.scale = newScale;
        s.lastPinchDist = newDist;
        onViewChange?.(s.offsetX, s.offsetY, s.scale);
        return;
      }

      if (e.touches.length === 1 && s.isDrawing) {
        const { x, y } = getTouch(e);
        const dx = x - s.lastPanX;
        const dy = y - s.lastPanY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 移动超过阈值 → 拖拽绘制
        if (dist > 3) {
          clearLongPress();
          const { cellX, cellY } = screenToCell(x, y);
          const cellKey = `${cellX},${cellY}`;
          if (isValidCell(cellX, cellY) && cellKey !== lastDrawCellRef.current) {
            lastDrawCellRef.current = cellKey;
            onCellDrag?.(cellX, cellY);
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      clearLongPress();

      if (s.isDrawing && e.changedTouches.length > 0) {
        const elapsed = Date.now() - s.drawStartTime;
        if (elapsed < 300 && lastDrawCellRef.current === '') {
          // 短按 = 点击放置
          const rect = canvas.getBoundingClientRect();
          const touch = e.changedTouches[0];
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          const { cellX, cellY } = screenToCell(x, y);
          if (isValidCell(cellX, cellY)) {
            onCellTap?.(cellX, cellY);
          }
        }
      }

      s.isDrawing = false;
      s.isPanning = false;
    };

    // 鼠标事件（PC端）
    let mouseDown = false;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseDown = true;

      if (e.button === 1 || e.button === 2) {
        // 中键/右键 = 平移
        s.isPanning = true;
        s.lastPanX = x;
        s.lastPanY = y;
        return;
      }

      // 左键 = 绘制
      s.isDrawing = true;
      s.drawStartTime = Date.now();
      lastDrawCellRef.current = '';
      const { cellX, cellY } = screenToCell(x, y);
      if (isValidCell(cellX, cellY)) {
        onCellTap?.(cellX, cellY);
        lastDrawCellRef.current = `${cellX},${cellY}`;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseDown) return;
      const s = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (s.isPanning) {
        s.offsetX += x - s.lastPanX;
        s.offsetY += y - s.lastPanY;
        s.lastPanX = x;
        s.lastPanY = y;
        onViewChange?.(s.offsetX, s.offsetY, s.scale);
        return;
      }

      if (s.isDrawing) {
        const { cellX, cellY } = screenToCell(x, y);
        const cellKey = `${cellX},${cellY}`;
        if (isValidCell(cellX, cellY) && cellKey !== lastDrawCellRef.current) {
          lastDrawCellRef.current = cellKey;
          onCellDrag?.(cellX, cellY);
        }
      }
    };

    const handleMouseUp = () => {
      const s = stateRef.current;
      mouseDown = false;
      s.isDrawing = false;
      s.isPanning = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(minScale, Math.min(maxScale, s.scale * factor));
      const scaleChange = newScale / s.scale;
      s.offsetX = cx - (cx - s.offsetX) * scaleChange;
      s.offsetY = cy - (cy - s.offsetY) * scaleChange;
      s.scale = newScale;
      onViewChange?.(s.offsetX, s.offsetY, s.scale);
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      clearLongPress();
    };
  }, [canvasRef, screenToCell, isValidCell, clearLongPress, onCellTap, onCellDrag, onCellLongPress, onViewChange, minScale, maxScale]);

  return {
    stateRef,
    centerView,
    screenToCell,
  };
}
