/**
 * 交互式Canvas组件
 * 支持触摸和鼠标操作，用于编辑珠子图案
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BeadPixelData, renderBeadsToCanvas } from '../services/colorMatchService';
import { BeadColor } from '../data/beadColors';
import { EditorTool } from '../store/editorStore';
import { colors, radius, shadows } from '../styles/designSystem';

interface InteractiveCanvasProps {
  beadData: BeadPixelData;
  cellSize: number;
  currentTool: EditorTool;
  currentColor: BeadColor | null;
  isEditMode: boolean; // 是否处于编辑模式
  highlightedColorId: string | null; // 高亮显示的颜色ID
  onBeadClick: (x: number, y: number) => void;
  onBeadDrag: (x: number, y: number) => void;
  onDragEnd: () => void;
  onPickColor: (color: BeadColor) => void;
  // 背景处理模式相关
  isBackgroundMode?: boolean; // 是否处于背景处理模式
  bgModeHighlightedIndices?: number[]; // 背景模式高亮的网格索引
  bgModeExcludedIndices?: Set<number>; // 背景模式排除的网格索引
  bgViewMode?: 'select' | 'view'; // 背景模式交互方式：select=选择，view=查看
  onBgSelectColor?: (index: number) => void; // 背景模式选择颜色
  onBgToggleExclude?: (index: number) => void; // 背景模式切换排除
  // 大网格线
  showMajorGrid?: boolean; // 是否显示大网格线（5×5 + 10×10）
}

const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
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
  // 背景处理模式
  isBackgroundMode = false,
  bgModeHighlightedIndices = [],
  bgModeExcludedIndices = new Set(),
  bgViewMode = 'select',
  onBgSelectColor,
  onBgToggleExclude,
  // 大网格线
  showMajorGrid = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastCell, setLastCell] = useState<{ x: number; y: number } | null>(null);

  // 缩放和平移状态
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false); // 是否已初始化适配缩放

  // 双指缩放状态
  const [isPinching, setIsPinching] = useState(false);
  const pinchStartDistance = useRef<number>(0);
  const pinchStartScale = useRef<number>(1);
  const MIN_SCALE = 0.1;  // 最小缩放 10%（允许更小以适配大图）
  const MAX_SCALE = 6;    // 最大缩放 600%（6倍）

  // 计算适配预览区的缩放比例
  const calculateFitScale = useCallback(() => {
    if (!containerRef.current || !beadData) return 1;

    // 容器可用尺寸（减去 padding）
    const containerWidth = containerRef.current.clientWidth - 8; // padding: 4px * 2
    const containerHeight = containerRef.current.clientHeight - 8;

    // 图片原始尺寸
    const imageWidth = beadData.width * cellSize;
    const imageHeight = beadData.height * cellSize;

    // 计算水平和垂直方向的缩放比例
    const scaleX = containerWidth / imageWidth;
    const scaleY = containerHeight / imageHeight;

    // 取较小值，确保图片完整显示
    let fitScale = Math.min(scaleX, scaleY);

    // 限制在合理范围内
    fitScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale));

    return fitScale;
  }, [beadData, cellSize]);

  // beadData 变化时，重新计算并设置适配缩放
  useEffect(() => {
    if (beadData && containerRef.current) {
      // 使用 requestAnimationFrame 确保容器尺寸已更新
      requestAnimationFrame(() => {
        const fitScale = calculateFitScale();
        setScale(fitScale);
        setIsInitialized(true);
      });
    }
  }, [beadData?.width, beadData?.height, calculateFitScale]);

  // 计算实际渲染的 cellSize（考虑缩放）
  const scaledCellSize = Math.round(cellSize * scale);

  // 渲染Canvas（包含高亮效果）- 使用实际分辨率渲染，确保放大时清晰
  useEffect(() => {
    if (canvasRef.current && beadData) {
      // 使用缩放后的 cellSize 渲染，确保放大时文字清晰
      renderBeadsToCanvas(beadData, canvasRef.current, scaledCellSize, true, false, showMajorGrid);

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // 背景处理模式的渲染
      if (isBackgroundMode) {
        const highlightedSet = new Set(bgModeHighlightedIndices);

        for (let y = 0; y < beadData.height; y++) {
          for (let x = 0; x < beadData.width; x++) {
            const index = y * beadData.width + x;
            const bead = beadData.beads[index];
            const px = x * scaledCellSize;
            const py = y * scaledCellSize;

            if (highlightedSet.has(index)) {
              // 高亮的网格（将被透明化）- 绘制金色边框 + 半透明遮罩
              ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
              ctx.fillRect(px, py, scaledCellSize, scaledCellSize);
              ctx.strokeStyle = '#FFD700';
              ctx.lineWidth = Math.max(2, scale);
              ctx.strokeRect(px + 1, py + 1, scaledCellSize - 2, scaledCellSize - 2);
            } else if (bgModeExcludedIndices.has(index) && bead && bead.id === highlightedColorId) {
              // 被排除的网格（同色但被保护）- 绘制绿色边框
              ctx.strokeStyle = '#00FF00';
              ctx.lineWidth = Math.max(2, scale);
              ctx.strokeRect(px + 1, py + 1, scaledCellSize - 2, scaledCellSize - 2);
            }
          }
        }
      } else if (highlightedColorId) {
        // 普通模式的高亮效果
        // 遍历所有珠子，为匹配的颜色绘制高亮边框
        for (let y = 0; y < beadData.height; y++) {
          for (let x = 0; x < beadData.width; x++) {
            const index = y * beadData.width + x;
            const bead = beadData.beads[index];
            if (bead && bead.id === highlightedColorId) {  // 跳过透明珠子
              const px = x * scaledCellSize;
              const py = y * scaledCellSize;
              // 绘制高亮边框
              ctx.strokeStyle = '#FFD700'; // 金色边框
              ctx.lineWidth = Math.max(2, scale);
              ctx.strokeRect(px + 1, py + 1, scaledCellSize - 2, scaledCellSize - 2);
            }
          }
        }
      }
    }
  }, [beadData, cellSize, scale, scaledCellSize, highlightedColorId, isBackgroundMode, bgModeHighlightedIndices, bgModeExcludedIndices]);

  // 获取Canvas相对坐标（考虑缩放）
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    // Canvas 现在是实际分辨率，rect 和 canvas 尺寸一致
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // 使用缩放后的 cellSize 计算网格坐标
    const cellX = Math.floor(x / scaledCellSize);
    const cellY = Math.floor(y / scaledCellSize);

    if (cellX >= 0 && cellX < beadData.width && cellY >= 0 && cellY < beadData.height) {
      return { x: cellX, y: cellY };
    }
    return null;
  }, [beadData, scaledCellSize]);

  // 处理点击/触摸开始（仅在编辑模式下）
  const handleStart = useCallback((clientX: number, clientY: number, isTouch: boolean = false) => {
    // 非编辑模式下不处理，让浏览器处理滚动
    if (!isEditMode) return;

    const coords = getCanvasCoords(clientX, clientY);
    if (!coords) return;

    const index = coords.y * beadData.width + coords.x;

    // 背景处理模式的点击处理
    if (isBackgroundMode) {
      const bead = beadData.beads[index];

      // 如果还没选择颜色，点击任意非透明网格选择该颜色
      if (!highlightedColorId) {
        if (bead && onBgSelectColor) {
          onBgSelectColor(index);
        }
        return;
      }

      // 已选择颜色，点击高亮网格或同色网格进行排除/恢复
      const highlightedSet = new Set(bgModeHighlightedIndices);
      if (highlightedSet.has(index) || (bead && bead.id === highlightedColorId && bgModeExcludedIndices.has(index))) {
        // 点击高亮的网格 -> 排除它
        // 点击已排除的同色网格 -> 恢复它
        if (onBgToggleExclude) {
          onBgToggleExclude(index);
        }
      }
      return;
    }

    // 正常模式的点击处理
    if (currentTool === 'picker') {
      // 吸色工具
      const color = beadData.beads[index];
      if (color) onPickColor(color);  // 透明珠子不吸色
    } else if (currentTool === 'fill') {
      // 填充工具 - 只在点击时执行
      onBeadClick(coords.x, coords.y);
    } else {
      // 画笔/橡皮 - 支持拖动
      setIsDragging(true);
      setLastCell(coords);
      onBeadClick(coords.x, coords.y);
    }
  }, [beadData, currentTool, getCanvasCoords, onBeadClick, onPickColor, isEditMode, isBackgroundMode, highlightedColorId, bgModeHighlightedIndices, bgModeExcludedIndices, onBgSelectColor, onBgToggleExclude]);

  // 处理移动（拖动绘制）
  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || currentTool === 'fill' || currentTool === 'picker') return;

    const coords = getCanvasCoords(clientX, clientY);
    if (!coords) return;

    // 避免重复绘制同一个格子
    if (lastCell && coords.x === lastCell.x && coords.y === lastCell.y) return;

    setLastCell(coords);
    onBeadDrag(coords.x, coords.y);
  }, [isDragging, currentTool, getCanvasCoords, lastCell, onBeadDrag]);

  // 处理结束
  const handleEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setLastCell(null);
      onDragEnd();
    }
  }, [isDragging, onDragEnd]);

  // 鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // 左键
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

  // 计算两个触摸点之间的距离
  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY, true);
    } else if (e.touches.length === 2) {
      // 双指 - 开始缩放
      e.preventDefault(); // 阻止浏览器默认缩放
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
      // 双指缩放
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scaleRatio = currentDistance / pinchStartDistance.current;
      let newScale = pinchStartScale.current * scaleRatio;

      // 限制缩放范围
      newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      setScale(newScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // 如果还有一个手指在屏幕上，不结束缩放状态
    if (e.touches.length < 2) {
      setIsPinching(false);
    }
    if (e.touches.length === 0) {
      handleEnd();
    }
  };

  // 工具光标
  const getCursor = () => {
    // 背景模式查看时显示抓手
    if (isBackgroundMode && bgViewMode === 'view') {
      return 'grab';
    }
    // 背景模式选择时显示十字
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

  // Canvas 使用实际缩放后的尺寸（高分辨率渲染）
  const canvasWidth = beadData.width * scaledCellSize;
  const canvasHeight = beadData.height * scaledCellSize;

  return (
    <div style={styles.wrapper}>
      {/* Canvas 容器 */}
      <div
        ref={containerRef}
        style={{
          ...styles.container,
          cursor: getCursor(),
        }}
      >
        {/* 缩放容器 - 设置实际尺寸以支持滚动，小图时居中显示 */}
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            minWidth: canvasWidth,
            minHeight: canvasHeight,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            margin: 'auto', // 小图时居中显示
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              ...styles.canvas,
              // Canvas 尺寸与实际像素一致，不使用 CSS 缩放，确保清晰度
              width: canvasWidth,
              height: canvasHeight,
              // 编辑模式下阻止滚动，浏览模式下允许滚动
              // 背景模式查看时也允许滚动
              // 注意：双指缩放通过 e.preventDefault() 在事件处理中阻止
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

      {/* 缩放控制 - 固定在外层底部 */}
      <div style={styles.zoomControls}>
        <button
          style={styles.zoomButton}
          onClick={() => setScale(Math.max(MIN_SCALE, scale - 0.1))}
        >
          −
        </button>
        <input
          type="range"
          min={Math.round(MIN_SCALE * 100)}
          max={Math.round(MAX_SCALE * 100)}
          value={Math.round(scale * 100)}
          onChange={(e) => setScale(Number(e.target.value) / 100)}
          style={styles.zoomSlider}
        />
        <span style={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button
          style={styles.zoomButton}
          onClick={() => setScale(Math.min(MAX_SCALE, scale + 0.1))}
        >
          +
        </button>
        <button
          style={styles.zoomButton}
          onClick={() => setScale(calculateFitScale())}
          title="适配预览区"
        >
          适配
        </button>
        <button
          style={styles.zoomButton}
          onClick={() => setScale(1)}
        >
          1:1
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  container: {
    position: 'relative',
    width: '100%',
    height: '45vh', // 固定高度，避免内容变化时跳动
    minHeight: '45vh',
    maxHeight: '45vh',
    background: colors.bg.card,
    borderRadius: radius.card,
    border: `2px solid ${colors.bead.cyan}40`,
    padding: '4px', // 最小 padding，让图片尽可能大
    display: 'flex', // 改为 flex 布局支持垂直居中
    alignItems: 'center', // 垂直居中
    justifyContent: 'center', // 水平居中
    overflow: 'auto', // 允许滚动查看放大后的图片
    boxShadow: shadows.md,
    WebkitOverflowScrolling: 'touch', // iOS 平滑滚动
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
