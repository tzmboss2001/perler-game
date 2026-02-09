/**
 * ResultCanvas - 失败效果可视化画布
 * 根据不同失败类型渲染拼豆的视觉效果
 */

import { useRef, useEffect } from 'react';
import type { Bead, FailureType } from '@/types/game';
import './ResultCanvas.css';

interface ResultCanvasProps {
  beads: Bead[];
  boardWidth: number;
  boardHeight: number;
  failureType?: FailureType;
  success?: boolean;
}

const CELL = 18; // 结果展示用的格子大小
const BEAD_R = 7; // 拼豆半径
const PAD = 12;   // 画布内边距

// 用确定性随机（基于坐标种子），避免每帧不同
function seededRandom(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

export default function ResultCanvas({
  beads,
  boardWidth,
  boardHeight,
  failureType,
  success,
}: ResultCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || beads.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const totalW = boardWidth * CELL + PAD * 2;
    const totalH = boardHeight * CELL + PAD * 2;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = totalW * dpr;
    canvas.height = totalH * dpr;
    canvas.style.width = `${totalW}px`;
    canvas.style.height = `${totalH}px`;
    ctx.scale(dpr, dpr);

    // 背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, totalW, totalH);

    // 画板区域背景
    ctx.fillStyle = 'rgba(26, 26, 62, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const boardLeft = PAD;
    const boardTop = PAD;
    const boardW = boardWidth * CELL;
    const boardH = boardHeight * CELL;
    ctx.fillRect(boardLeft, boardTop, boardW, boardH);
    ctx.strokeRect(boardLeft, boardTop, boardW, boardH);

    // 根据失败类型选择绘制方式
    if (success) {
      drawSuccess(ctx, beads, boardLeft, boardTop);
    } else {
      switch (failureType) {
        case 'undercooked':
          drawUndercooked(ctx, beads, boardLeft, boardTop);
          break;
        case 'partial_melt':
          drawPartialMelt(ctx, beads, boardLeft, boardTop);
          break;
        case 'collapse':
          drawCollapse(ctx, beads, boardLeft, boardTop, boardWidth, boardHeight);
          break;
        case 'burned':
          drawBurned(ctx, beads, boardLeft, boardTop);
          break;
        case 'sticky':
          drawSticky(ctx, beads, boardLeft, boardTop);
          break;
        default:
          drawSuccess(ctx, beads, boardLeft, boardTop);
      }
    }
  }, [beads, boardWidth, boardHeight, failureType, success]);

  if (beads.length === 0) return null;

  return (
    <div className="result-canvas-wrapper">
      <canvas ref={canvasRef} className="result-canvas" />
    </div>
  );
}

// ====== 成功：完美融合 ======
function drawSuccess(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  for (const b of beads) {
    const cx = ox + b.x * CELL + CELL / 2;
    const cy = oy + b.y * CELL + CELL / 2;
    // 融合后的拼豆 - 略微扁平，没有中孔
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(cx, cy, BEAD_R + 1, 0, Math.PI * 2);
    ctx.fill();
    // 轻微高光
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ====== 半生不熟：拼豆没融合，有间隙，能看到中孔 ======
function drawUndercooked(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  for (const b of beads) {
    const r = seededRandom(b.x, b.y, 1);
    // 随机微偏移，模拟没粘住
    const jx = (r - 0.5) * 3;
    const jy = (seededRandom(b.x, b.y, 2) - 0.5) * 3;
    const cx = ox + b.x * CELL + CELL / 2 + jx;
    const cy = oy + b.y * CELL + CELL / 2 + jy;

    // 半透明 - 没完全融合
    ctx.globalAlpha = 0.7 + r * 0.3;

    // 拼豆主体（保留原始圆形）
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(cx, cy, BEAD_R - 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 可见的中孔（没融合的标志）
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 画一些裂缝线，表示没粘住
  ctx.strokeStyle = 'rgba(100, 100, 150, 0.4)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < beads.length; i += 3) {
    const b = beads[i];
    const cx = ox + b.x * CELL + CELL / 2;
    const cy = oy + b.y * CELL + CELL / 2;
    const angle = seededRandom(b.x, b.y, 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 4, cy + Math.sin(angle) * 4);
    ctx.lineTo(cx + Math.cos(angle) * (BEAD_R + 2), cy + Math.sin(angle) * (BEAD_R + 2));
    ctx.stroke();
  }
}

// ====== 局部融化：部分拼豆变形，部分正常 ======
function drawPartialMelt(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  for (const b of beads) {
    const cx = ox + b.x * CELL + CELL / 2;
    const cy = oy + b.y * CELL + CELL / 2;

    if (b.state === 'melted') {
      // 融化的拼豆 - 变形为椭圆/不规则形状
      const stretch = 1.2 + seededRandom(b.x, b.y, 1) * 0.5;
      const angle = seededRandom(b.x, b.y, 2) * Math.PI;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.scale(stretch, 1 / stretch);

      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(0, 0, BEAD_R + 1, 0, Math.PI * 2);
      ctx.fill();

      // 融化痕迹
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(-1, -1, BEAD_R * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      // 正常的拼豆
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(cx, cy, BEAD_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ====== 整体塌陷：所有拼豆向中心收缩、挤压变形 ======
function drawCollapse(
  ctx: CanvasRenderingContext2D,
  beads: Bead[],
  ox: number,
  oy: number,
  bw: number,
  bh: number,
) {
  const centerX = bw / 2;
  const centerY = bh / 2;

  for (const b of beads) {
    // 向中心收缩
    const dx = b.x - centerX;
    const dy = b.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const shrink = 0.5 + seededRandom(b.x, b.y, 1) * 0.2; // 收缩50-70%
    const nx = centerX + dx * shrink;
    const ny = centerY + dy * shrink;

    const cx = ox + nx * CELL + CELL / 2;
    const cy = oy + ny * CELL + CELL / 2;

    // 扁平化
    const squash = 0.6 + seededRandom(b.x, b.y, 2) * 0.3;
    const angle = Math.atan2(dy, dx) + seededRandom(b.x, b.y, 3) * 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(1.3, squash);

    // 塌陷的拼豆 - 变暗
    ctx.globalAlpha = 0.6 + seededRandom(b.x, b.y, 4) * 0.3;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(0, 0, BEAD_R * (0.8 + dist * 0.01), 0, Math.PI * 2);
    ctx.fill();

    // 暗色覆盖
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, BEAD_R * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // 在上方画裂纹效果
  ctx.strokeStyle = 'rgba(80, 80, 80, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const sx = ox + seededRandom(i, 0, 10) * bw * CELL;
    const sy = oy + seededRandom(0, i, 11) * bh * CELL;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let j = 0; j < 3; j++) {
      ctx.lineTo(
        sx + (seededRandom(i, j, 12) - 0.5) * 40,
        sy + seededRandom(i, j, 13) * 30,
      );
    }
    ctx.stroke();
  }
}

// ====== 颜色烧焦：颜色偏移 + 焦痕 + 烟雾效果 ======
function drawBurned(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  for (const b of beads) {
    const cx = ox + b.x * CELL + CELL / 2;
    const cy = oy + b.y * CELL + CELL / 2;

    // 拼豆主体（颜色已经在 FailureEngine 里偏移过了）
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(cx, cy, BEAD_R + 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 焦痕斑点
    const spotCount = Math.floor(seededRandom(b.x, b.y, 1) * 3);
    for (let s = 0; s < spotCount; s++) {
      const sr = seededRandom(b.x, b.y, s + 5);
      const sa = seededRandom(b.x, b.y, s + 8) * Math.PI * 2;
      const sd = sr * (BEAD_R - 2);
      ctx.fillStyle = `rgba(60, 40, 20, ${0.2 + sr * 0.3})`;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(sa) * sd,
        cy + Math.sin(sa) * sd,
        1 + sr * 1.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // 融合痕迹（没有中孔了，过度融合）
    ctx.fillStyle = 'rgba(100, 70, 30, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, BEAD_R * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 烟雾效果
  for (let i = 0; i < 8; i++) {
    const sx = ox + seededRandom(i, 0, 20) * beads.length % (beads.length);
    const refBead = beads[Math.floor(sx) % beads.length];
    if (!refBead) continue;
    const smokeX = ox + refBead.x * CELL + CELL / 2;
    const smokeY = oy + refBead.y * CELL - seededRandom(i, 1, 21) * 15;
    const smokeR = 4 + seededRandom(i, 2, 22) * 8;
    const gradient = ctx.createRadialGradient(smokeX, smokeY, 0, smokeX, smokeY, smokeR);
    gradient.addColorStop(0, 'rgba(80, 80, 80, 0.15)');
    gradient.addColorStop(1, 'rgba(80, 80, 80, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(smokeX, smokeY, smokeR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ====== 粘连拉扯：部分拼豆位移 + 拉丝效果 ======
function drawSticky(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  // 先建立位置索引
  const beadMap = new Map<string, Bead>();
  for (const b of beads) beadMap.set(`${b.x},${b.y}`, b);

  // 计算位移后的位置
  const displaced = new Map<string, { cx: number; cy: number; moved: boolean }>();
  for (const b of beads) {
    const baseCx = ox + b.x * CELL + CELL / 2;
    const baseCy = oy + b.y * CELL + CELL / 2;
    if (b.state === 'melted') {
      // 被拉扯位移
      const dx = (seededRandom(b.x, b.y, 1) - 0.5) * CELL * 0.8;
      const dy = (seededRandom(b.x, b.y, 2) - 0.5) * CELL * 0.8;
      displaced.set(`${b.x},${b.y}`, { cx: baseCx + dx, cy: baseCy + dy, moved: true });
    } else {
      displaced.set(`${b.x},${b.y}`, { cx: baseCx, cy: baseCy, moved: false });
    }
  }

  // 画拉丝线（在拼豆下面）
  ctx.lineCap = 'round';
  for (const b of beads) {
    if (b.state !== 'melted') continue;
    const pos = displaced.get(`${b.x},${b.y}`);
    if (!pos) continue;

    // 与相邻拼豆之间画拉丝
    const neighbors = [
      [b.x - 1, b.y], [b.x + 1, b.y],
      [b.x, b.y - 1], [b.x, b.y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      const nKey = `${nx},${ny}`;
      const nPos = displaced.get(nKey);
      if (!nPos) continue;

      // 拉丝效果
      ctx.strokeStyle = `rgba(200, 180, 160, 0.35)`;
      ctx.lineWidth = 1 + seededRandom(b.x + nx, b.y + ny, 7) * 1.5;
      ctx.beginPath();
      ctx.moveTo(pos.cx, pos.cy);
      // 拉丝弧线
      const midX = (pos.cx + nPos.cx) / 2 + (seededRandom(b.x, ny, 8) - 0.5) * 6;
      const midY = (pos.cy + nPos.cy) / 2 + (seededRandom(nx, b.y, 9) - 0.5) * 6;
      ctx.quadraticCurveTo(midX, midY, nPos.cx, nPos.cy);
      ctx.stroke();
    }
  }

  // 画拼豆
  for (const b of beads) {
    const pos = displaced.get(`${b.x},${b.y}`);
    if (!pos) continue;

    if (pos.moved) {
      // 被拉扯变形的拼豆
      const stretch = 1.1 + seededRandom(b.x, b.y, 3) * 0.3;
      const angle = seededRandom(b.x, b.y, 4) * Math.PI;

      ctx.save();
      ctx.translate(pos.cx, pos.cy);
      ctx.rotate(angle);
      ctx.scale(stretch, 1 / stretch * 0.9);

      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(0, 0, BEAD_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(-1.5, -1.5, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      // 正常位置的拼豆
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(pos.cx, pos.cy, BEAD_R + 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(pos.cx - 2, pos.cy - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
