/**
 * TapingPanel - 贴美纹纸面板
 * 在豆子上拖拽画胶带条
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSound } from '@/hooks/useSound';
import {
  createTapeStrip,
  calculateTapingResult,
  getTapeCoveredCells,
} from '@/core/TapingSystem';
import type { TapeStrip, TapingResult } from '@/types/game';
import './TapingPanel.css';

/** 画布配置 */
const CELL_SIZE = 18;
const PADDING = 16;
const TAPE_COLOR = 'rgba(245, 240, 224, 0.6)'; // 半透明米色
const TAPE_STROKE = 'rgba(210, 190, 150, 0.8)';

export default function TapingPanel() {
  const { board, setPhase, setTapingResult, addStepRecord } = useGameStore();
  const { place: playTapeSound } = useSound();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strips, setStrips] = useState<TapeStrip[]>([]);
  const [currentResult, setCurrentResult] = useState<TapingResult | null>(null);
  const [showHint, setShowHint] = useState(true);

  // 拖拽状态
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    isDragging: boolean;
  } | null>(null);
  const [previewStrip, setPreviewStrip] = useState<{
    startX: number; startY: number; endX: number; endY: number;
  } | null>(null);

  const canvasWidth = board.width * CELL_SIZE + PADDING * 2;
  const canvasHeight = board.height * CELL_SIZE + PADDING * 2;

  // 坐标转换：屏幕坐标 → 网格坐标
  const screenToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX / CELL_SIZE - PADDING / CELL_SIZE,
      y: (clientY - rect.top) * scaleY / CELL_SIZE - PADDING / CELL_SIZE,
    };
  }, []);

  // 渲染
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 画豆子预览（简化显示）
    for (const bead of board.beads.values()) {
      const cx = PADDING + bead.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = PADDING + bead.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.fillStyle = bead.color;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 画已确认的胶带条
    for (const strip of strips) {
      drawTapeStrip(ctx, strip, false);
    }

    // 画实时预览胶带
    if (previewStrip) {
      const tempStrip: TapeStrip = {
        id: 'preview',
        startX: previewStrip.startX,
        startY: previewStrip.startY,
        endX: previewStrip.endX,
        endY: previewStrip.endY,
        width: 3,
        pressure: 0.5,
      };
      drawTapeStrip(ctx, tempStrip, true);
    }

    // 标记未覆盖区域的警告（红色虚线框）
    if (currentResult && strips.length > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      for (const p of currentResult.uncoveredAreas) {
        const px = PADDING + p.x * CELL_SIZE;
        const py = PADDING + p.y * CELL_SIZE;
        ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
      ctx.setLineDash([]);

      // 弱按压区域（黄色虚线框）
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.setLineDash([2, 2]);
      for (const p of currentResult.weakAreas) {
        const px = PADDING + p.x * CELL_SIZE;
        const py = PADDING + p.y * CELL_SIZE;
        ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
      ctx.setLineDash([]);
    }
  }, [board, strips, previewStrip, currentResult]);

  /** 画一条胶带 */
  function drawTapeStrip(ctx: CanvasRenderingContext2D, strip: TapeStrip, isPreview: boolean) {
    const sx = PADDING + strip.startX * CELL_SIZE;
    const sy = PADDING + strip.startY * CELL_SIZE;
    const ex = PADDING + strip.endX * CELL_SIZE;
    const ey = PADDING + strip.endY * CELL_SIZE;

    const dx = ex - sx;
    const dy = ey - sy;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 2) return;

    const angle = Math.atan2(dy, dx);
    const halfW = (strip.width * CELL_SIZE) / 2;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // 胶带主体
    ctx.fillStyle = isPreview ? 'rgba(245, 240, 224, 0.4)' : TAPE_COLOR;
    ctx.fillRect(0, -halfW, length, halfW * 2);

    // 胶带边缘
    ctx.strokeStyle = isPreview ? 'rgba(210, 190, 150, 0.5)' : TAPE_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -halfW, length, halfW * 2);

    // 胶带纹理（斜线）
    ctx.strokeStyle = isPreview ? 'rgba(200, 180, 140, 0.2)' : 'rgba(200, 180, 140, 0.3)';
    ctx.lineWidth = 0.5;
    const step = 8;
    for (let i = 0; i < length + halfW * 2; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, -halfW);
      ctx.lineTo(i - halfW, halfW);
      ctx.stroke();
    }

    ctx.restore();
  }

  // 更新结果
  useEffect(() => {
    const result = calculateTapingResult(strips, board.beads, board.width, board.height);
    setCurrentResult(result);
  }, [strips, board]);

  // 渲染
  useEffect(() => {
    render();
  }, [render]);

  // 隐藏提示
  useEffect(() => {
    if (showHint) {
      const t = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showHint]);

  // 触摸/鼠标事件
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const grid = screenToGrid(e.clientX, e.clientY);
    dragRef.current = {
      startX: grid.x,
      startY: grid.y,
      startTime: Date.now(),
      isDragging: true,
    };
    setPreviewStrip(null);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [screenToGrid]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current?.isDragging) return;
    const grid = screenToGrid(e.clientX, e.clientY);
    setPreviewStrip({
      startX: dragRef.current.startX,
      startY: dragRef.current.startY,
      endX: grid.x,
      endY: grid.y,
    });
  }, [screenToGrid]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current?.isDragging) return;
    const grid = screenToGrid(e.clientX, e.clientY);
    const drag = dragRef.current;
    const elapsed = (Date.now() - drag.startTime) / 1000;
    const dx = grid.x - drag.startX;
    const dy = grid.y - drag.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 最小长度检查
    if (dist > 1.5) {
      const speed = dist / Math.max(elapsed, 0.1);
      const strip = createTapeStrip(drag.startX, drag.startY, grid.x, grid.y, speed);
      setStrips((prev) => [...prev, strip]);
      playTapeSound();
    }

    dragRef.current = null;
    setPreviewStrip(null);
  }, [screenToGrid, playTapeSound]);

  // 撤销最后一条胶带
  const handleUndo = () => {
    setStrips((prev) => prev.slice(0, -1));
  };

  // 返回放豆阶段
  const handleBack = () => {
    setPhase('placing');
  };

  // 下一步：翻转
  const handleNext = () => {
    if (!currentResult) return;
    setTapingResult(currentResult);

    addStepRecord({
      step: 'taping',
      score: Math.round(currentResult.coverage * 100),
      detail: `覆盖率 ${Math.round(currentResult.coverage * 100)}%，平均按压 ${Math.round(currentResult.avgPressure * 100)}%`,
      beadsBefore: board.count,
      beadsAfter: board.count,
    });

    setPhase('flipping');
  };

  const coverage = currentResult?.coverage ?? 0;
  const coverageLevel = coverage >= 0.7 ? 'high' : coverage >= 0.4 ? 'medium' : 'low';

  return (
    <div className="taping-panel">
      <div className="taping-header">
        <span className="step-badge">步骤 2/6</span>
        <h2>贴美纹纸</h2>
        <span style={{ width: 48 }} />
      </div>

      <div className="taping-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            width: '100%',
            maxWidth: canvasWidth,
            maxHeight: '100%',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        {showHint && (
          <div className="taping-hint">
            在豆子上拖拽画出胶带条，固定豆子防止翻转时掉落
          </div>
        )}
      </div>

      {/* 覆盖率信息 */}
      <div className="taping-info-bar">
        <span style={{ fontSize: '0.8rem', color: '#8a7a6a' }}>覆盖率</span>
        <div className="coverage-bar">
          <div
            className={`coverage-fill ${coverageLevel}`}
            style={{ width: `${Math.min(coverage * 100, 100)}%` }}
          />
        </div>
        <span className="coverage-text">{Math.round(coverage * 100)}%</span>
      </div>

      {/* 警告 */}
      {currentResult && strips.length > 0 && (
        <div style={{ padding: '0 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {currentResult.uncoveredAreas.length > 0 && coverage < 0.7 && (
            <div className="taping-warning red">
              {currentResult.uncoveredAreas.length}颗豆子未覆盖
            </div>
          )}
          {currentResult.weakAreas.length > 0 && (
            <div className="taping-warning yellow">
              {currentResult.weakAreas.length}处按压不实
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="taping-actions">
        <button className="btn-back" onClick={handleBack}>返回</button>
        <button
          className="btn-undo"
          onClick={handleUndo}
          disabled={strips.length === 0}
        >
          ↩
        </button>
        <button
          className="btn-next"
          onClick={handleNext}
          disabled={strips.length === 0}
        >
          下一步：翻转
        </button>
      </div>
    </div>
  );
}
