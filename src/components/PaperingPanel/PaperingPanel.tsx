/**
 * PaperingPanel - 铺烘焙纸面板
 * 拖拽纸张覆盖豆子，覆盖不全增加烧焦风险
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSound } from '@/hooks/useSound';
import { calculatePaperCoverage, getIroningModifier } from '@/core/PaperingSystem';
import './PaperingPanel.css';

const CELL_SIZE = 18;
const PADDING = 16;
const PAPER_COLOR = 'rgba(255, 252, 245, 0.55)';
const PAPER_BORDER = 'rgba(180, 160, 130, 0.6)';

export default function PaperingPanel() {
  const {
    board,
    survivingBeads,
    setPhase,
    setPaperCoverage,
    addStepRecord,
  } = useGameStore();
  const { place: playPaperSound } = useSound();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showHint, setShowHint] = useState(true);

  // 纸张位置（相对于画布的偏移，0,0 表示完全对齐）
  const [paperOffset, setPaperOffset] = useState({ x: 0, y: -board.height - 5 }); // 初始在上方
  const [coverage, setCoverage] = useState(0);

  // 使用存活豆子还是全部豆子
  const beads = survivingBeads || board.beads;

  const canvasWidth = board.width * CELL_SIZE + PADDING * 2;
  const canvasHeight = board.height * CELL_SIZE + PADDING * 2;

  // 纸张尺寸（比画布大一些）
  const paperW = (board.width + 4) * CELL_SIZE;
  const paperH = (board.height + 4) * CELL_SIZE;

  const dragRef = useRef<{
    startPointerX: number;
    startPointerY: number;
    startOffsetX: number;
    startOffsetY: number;
    isDragging: boolean;
  } | null>(null);

  // 渲染
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 画豆子（正面朝上）
    for (const bead of beads.values()) {
      const cx = PADDING + bead.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = PADDING + bead.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.fillStyle = bead.color;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 画烘焙纸
    const px = PADDING + paperOffset.x * CELL_SIZE - 2 * CELL_SIZE;
    const py = PADDING + paperOffset.y * CELL_SIZE - 2 * CELL_SIZE;

    ctx.fillStyle = PAPER_COLOR;
    ctx.strokeStyle = PAPER_BORDER;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);

    ctx.fillRect(px, py, paperW, paperH);
    ctx.strokeRect(px, py, paperW, paperH);
    ctx.setLineDash([]);

    // 纸张纹理
    ctx.strokeStyle = 'rgba(200, 185, 160, 0.15)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < paperW; i += 12) {
      ctx.beginPath();
      ctx.moveTo(px + i, py);
      ctx.lineTo(px + i, py + paperH);
      ctx.stroke();
    }
  }, [beads, paperOffset, paperW, paperH]);

  // 计算覆盖率
  useEffect(() => {
    const cov = calculatePaperCoverage(
      {
        paperX: paperOffset.x - 2,
        paperY: paperOffset.y - 2,
        paperWidth: board.width + 4,
        paperHeight: board.height + 4,
        coverage: 0,
      },
      beads,
      board.width,
      board.height,
    );
    setCoverage(cov);
  }, [paperOffset, beads, board.width, board.height]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    if (showHint) {
      const t = setTimeout(() => setShowHint(false), 3000);
      return () => clearTimeout(t);
    }
  }, [showHint]);

  // 拖拽事件
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = {
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startOffsetX: paperOffset.x,
      startOffsetY: paperOffset.y,
      isDragging: true,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [paperOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current?.isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;

    const deltaX = (e.clientX - dragRef.current.startPointerX) * scaleX / CELL_SIZE;
    const deltaY = (e.clientY - dragRef.current.startPointerY) * scaleX / CELL_SIZE;

    setPaperOffset({
      x: dragRef.current.startOffsetX + deltaX,
      y: dragRef.current.startOffsetY + deltaY,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragRef.current?.isDragging) {
      playPaperSound();
    }
    dragRef.current = null;
  }, [playPaperSound]);

  // 快速居中
  const handleCenter = () => {
    setPaperOffset({ x: 0, y: 0 });
    playPaperSound();
  };

  // 下一步：熨烫
  const handleNext = () => {
    setPaperCoverage(coverage);

    addStepRecord({
      step: 'papering',
      score: Math.round(coverage * 100),
      detail: `覆盖率 ${Math.round(coverage * 100)}%，${getIroningModifier(coverage).description}`,
      beadsBefore: beads.size,
      beadsAfter: beads.size,
    });

    setPhase('ironing');
  };

  const coverageLevel = coverage >= 0.7 ? 'high' : coverage >= 0.4 ? 'medium' : 'low';
  const modifier = getIroningModifier(coverage);

  return (
    <div className="papering-panel">
      <div className="papering-header">
        <span className="step-badge" style={{
          background: '#d4a373',
          color: 'white',
          padding: '2px 10px',
          borderRadius: 12,
          fontSize: '0.75rem',
          fontWeight: 600,
        }}>步骤 5/6</span>
        <h2>铺烘焙纸</h2>
        <button
          onClick={handleCenter}
          style={{
            background: 'none', border: '1px solid #d4a373',
            borderRadius: 8, padding: '4px 10px', color: '#d4a373',
            fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          居中
        </button>
      </div>

      <div className="papering-canvas-wrap">
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
          <div className="papering-hint">
            拖拽烘焙纸覆盖豆子，防止熨烫时烧焦
          </div>
        )}
      </div>

      {/* 覆盖率信息 */}
      <div className="papering-info-bar">
        <span style={{ fontSize: '0.8rem', color: '#8a7a6a' }}>覆盖率</span>
        <div className="coverage-bar">
          <div
            className={`coverage-fill ${coverageLevel}`}
            style={{ width: `${Math.min(coverage * 100, 100)}%` }}
          />
        </div>
        <span className="coverage-text" style={{
          minWidth: 48,
          textAlign: 'right',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#5a4a3a',
        }}>{Math.round(coverage * 100)}%</span>
      </div>

      {/* 风险提示 */}
      {coverage < 0.95 && (
        <div style={{ padding: '4px 16px', fontSize: '0.8rem', color: modifier.burnRiskMultiplier > 1.3 ? '#ef4444' : '#f59e0b' }}>
          {modifier.description}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="papering-actions">
        <button className="btn-next" onClick={handleNext}>
          下一步：熨烫
        </button>
      </div>
    </div>
  );
}
