/**
 * GameCanvas - 拼豆游戏画布组件
 * 使用 Canvas 2D 绘制网格和拼豆
 */

import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useCanvasGesture } from '@/hooks/useCanvasGesture';
import { useSound } from '@/hooks/useSound';
import './GameCanvas.css';

const CELL_SIZE = 24; // 每格像素大小
const BEAD_RADIUS = 10; // 拼豆半径
const GRID_COLOR = 'rgba(255, 255, 255, 0.08)';
const GRID_BORDER_COLOR = 'rgba(255, 255, 255, 0.2)';
const BG_COLOR = '#16213e';
const PEG_COLOR = 'rgba(255, 255, 255, 0.15)';
const PEG_RADIUS = 2;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // 放置动画跟踪
  const animatingBeadsRef = useRef<Map<string, { startTime: number }>>(new Map());

  const board = useGameStore((s) => s.board);
  const renderVersion = useGameStore((s) => s.renderVersion);
  const selectedColor = useGameStore((s) => s.selectedColor);
  const selectedColorId = useGameStore((s) => s.selectedColorId);
  const drawTool = useGameStore((s) => s.drawTool);
  const placeBead = useGameStore((s) => s.placeBead);
  const removeBead = useGameStore((s) => s.removeBead);
  const selectedTemplate = useGameStore((s) => s.selectedTemplate);
  const showGuide = useGameStore((s) => s.showGuide);
  const sound = useSound();

  const handleCellTap = useCallback((cellX: number, cellY: number) => {
    if (drawTool === 'eraser') {
      removeBead(cellX, cellY);
      sound.remove();
    } else {
      // 添加放置动画
      const key = `${cellX},${cellY}`;
      animatingBeadsRef.current.set(key, { startTime: performance.now() });
      placeBead(cellX, cellY, selectedColor, selectedColorId);
      sound.place();
    }
  }, [drawTool, selectedColor, selectedColorId, placeBead, removeBead, sound]);

  const handleCellDrag = useCallback((cellX: number, cellY: number) => {
    if (drawTool === 'eraser') {
      removeBead(cellX, cellY);
    } else {
      const key = `${cellX},${cellY}`;
      animatingBeadsRef.current.set(key, { startTime: performance.now() });
      placeBead(cellX, cellY, selectedColor, selectedColorId);
    }
  }, [drawTool, selectedColor, selectedColorId, placeBead, removeBead]);

  const handleCellLongPress = useCallback((cellX: number, cellY: number) => {
    removeBead(cellX, cellY);
  }, [removeBead]);

  const handleViewChange = useCallback(() => {
    draw();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { stateRef, centerView } = useCanvasGesture(canvasRef, {
    cellSize: CELL_SIZE,
    boardWidth: board.width,
    boardHeight: board.height,
    onCellTap: handleCellTap,
    onCellDrag: handleCellDrag,
    onCellLongPress: handleCellLongPress,
    onViewChange: handleViewChange,
  });

  // 构建模板查找表
  const templateMapRef = useRef<Map<string, { color: string; colorId: string }>>(new Map());
  useEffect(() => {
    const map = new Map<string, { color: string; colorId: string }>();
    if (selectedTemplate) {
      for (const bead of selectedTemplate.beads) {
        map.set(`${bead.x},${bead.y}`, { color: bead.color, colorId: bead.colorId });
      }
    }
    templateMapRef.current = map;
  }, [selectedTemplate]);

  // 绘制函数
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { offsetX, offsetY, scale } = stateRef.current;

    // 清屏
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const totalW = board.width * CELL_SIZE;
    const totalH = board.height * CELL_SIZE;

    // 画板背景
    ctx.fillStyle = '#1a1a3e';
    ctx.fillRect(0, 0, totalW, totalH);

    // 绘制网格线
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= board.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, totalH);
      ctx.stroke();
    }
    for (let y = 0; y <= board.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(totalW, y * CELL_SIZE);
      ctx.stroke();
    }

    // 画板边框
    ctx.strokeStyle = GRID_BORDER_COLOR;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, totalW, totalH);

    const templateMap = templateMapRef.current;
    const hasGuide = showGuide && templateMap.size > 0;
    const now = performance.now();
    let hasRunningAnimations = false;

    // 绘制钉子和模板引导
    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.height; y++) {
        const hasBead = board.getBead(x, y);
        if (!hasBead) {
          const cx = x * CELL_SIZE + CELL_SIZE / 2;
          const cy = y * CELL_SIZE + CELL_SIZE / 2;

          // 模板引导：在空格上绘制半透明模板拼豆
          const templateBead = hasGuide ? templateMap.get(`${x},${y}`) : undefined;
          if (templateBead) {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = templateBead.color;
            ctx.beginPath();
            ctx.arc(cx, cy, BEAD_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          } else {
            // 普通钉子
            ctx.fillStyle = PEG_COLOR;
            ctx.beginPath();
            ctx.arc(cx, cy, PEG_RADIUS, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 绘制拼豆
    for (const bead of board.beads.values()) {
      const cx = bead.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = bead.y * CELL_SIZE + CELL_SIZE / 2;
      const key = `${bead.x},${bead.y}`;

      // 放置动画
      let animScale = 1;
      const animData = animatingBeadsRef.current.get(key);
      if (animData) {
        const elapsed = now - animData.startTime;
        const duration = 200; // 200ms 动画
        if (elapsed < duration) {
          const t = elapsed / duration;
          // 弹入效果: 0 → 1.2 → 1
          if (t < 0.6) {
            animScale = (t / 0.6) * 1.2;
          } else {
            animScale = 1.2 - 0.2 * ((t - 0.6) / 0.4);
          }
          hasRunningAnimations = true;
        } else {
          animatingBeadsRef.current.delete(key);
        }
      }

      ctx.save();
      if (animScale !== 1) {
        ctx.translate(cx, cy);
        ctx.scale(animScale, animScale);
        ctx.translate(-cx, -cy);
      }

      // 拼豆主体
      ctx.fillStyle = bead.color;
      ctx.beginPath();
      ctx.arc(cx, cy, BEAD_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // 中孔（拼豆特征）
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 高光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(cx - 2.5, cy - 2.5, 3, 0, Math.PI * 2);
      ctx.fill();

      // 模板引导：放错颜色的格子加红色标记
      if (hasGuide) {
        const templateBead = templateMap.get(key);
        if (templateBead && templateBead.colorId !== bead.colorId) {
          ctx.strokeStyle = 'rgba(255, 80, 80, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          // X 标记
          const s = BEAD_RADIUS * 0.5;
          ctx.moveTo(cx - s, cy - s);
          ctx.lineTo(cx + s, cy + s);
          ctx.moveTo(cx + s, cy - s);
          ctx.lineTo(cx - s, cy + s);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    ctx.restore();

    // 如果有动画在运行，持续重绘
    if (hasRunningAnimations) {
      requestAnimationFrame(draw);
    }
  }, [board, stateRef, showGuide]);

  // 初始化画布尺寸 & 居中
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      centerView(width, height);
      draw();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [centerView, draw]);

  // 数据变化时重绘
  useEffect(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(draw);
  }, [renderVersion, draw]);

  return (
    <div ref={containerRef} className="game-canvas-container">
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  );
}
