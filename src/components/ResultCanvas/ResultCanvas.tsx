/**
 * ResultCanvas - 失败效果可视化画布
 * 根据不同失败类型渲染拼豆的视觉效果
 */

import { useRef, useEffect } from 'react';
import type { Bead, FailureType, IroningPhysics } from '@/types/game';
import { drawContinuous } from './ContinuousRenderer';
import { beadSpec } from '@/core/beadSpec';
import { drawBead3D } from '@/core/BeadRenderer3D';
import './ResultCanvas.css';

interface ResultCanvasProps {
  beads: Bead[];
  boardWidth: number;
  boardHeight: number;
  failureType?: FailureType;
  success?: boolean;
  physics?: IroningPhysics;
}

const CELL = 18; // 结果展示用的格子大小
const { beadR: BEAD_R } = beadSpec(CELL);
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
  physics,
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

    // 优先使用连续渐变渲染，fallback 到离散渲染
    if (physics) {
      drawContinuous(ctx, beads, physics, boardLeft, boardTop, boardWidth, boardHeight);
    } else if (success) {
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
  }, [beads, boardWidth, boardHeight, failureType, success, physics]);

  if (beads.length === 0) return null;

  return (
    <div className="result-canvas-wrapper">
      <canvas ref={canvasRef} className="result-canvas" />
    </div>
  );
}

// ====== 成功：完美融合 - 完全无缝的一整片 ======
function drawSuccess(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  // 每个方块扩大0.5px，让相邻豆子重叠，彻底消除抗锯齿缝隙
  for (const b of beads) {
    ctx.fillStyle = b.color;
    ctx.fillRect(ox + b.x * CELL - 0.5, oy + b.y * CELL - 0.5, CELL + 1, CELL + 1);
  }
}

// ====== 半生不熟：拼豆没融合，保持环形，有中孔，严格保持原位 ======
function drawUndercooked(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  for (const b of beads) {
    const cx = ox + b.x * CELL + CELL / 2;
    const cy = oy + b.y * CELL + CELL / 2;

    // 3D 拼豆渲染（完全未融合，中孔完全可见）
    drawBead3D(ctx, cx, cy, b.color, CELL);
  }

  // 豆子之间画间隙线，强调"完全分离、没粘住"
  ctx.strokeStyle = 'rgba(22, 33, 62, 0.5)';
  ctx.lineWidth = 1;
  for (const b of beads) {
    const cx = ox + b.x * CELL + CELL / 2;
    const cy = oy + b.y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, BEAD_R + 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ====== 局部融化：融化区域无中孔，正常区域有中孔 ======
function drawPartialMelt(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  for (const b of beads) {
    const cx = ox + b.x * CELL + CELL / 2;
    const cy = oy + b.y * CELL + CELL / 2;

    if (b.state === 'melted') {
      // 融化的拼豆 - 变形为椭圆，无中孔（已融合）
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
      // 正常的拼豆 - 3D 立体渲染（完全未融合，中孔可见）
      drawBead3D(ctx, cx, cy, b.color, CELL);
    }
  }
}

// ====== 整体塌陷：完全融合的一整片塑料被过度加热后软化坍塌、皱缩变形 ======
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

  // 第1层：先画融合的方块底色（向中心收缩），整片是一体的
  for (const b of beads) {
    const dx = b.x - centerX;
    const dy = b.y - centerY;
    // 向中心收缩（温度太高，塑料片整体缩水）
    const shrink = 0.55 + seededRandom(b.x, b.y, 1) * 0.15;
    const nx = centerX + dx * shrink;
    const ny = centerY + dy * shrink;

    const px = ox + nx * CELL;
    const py = oy + ny * CELL;

    // 融合方块，收缩后边缘可能重叠（塑料皱缩堆积）
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(px - 0.5, py - 0.5, CELL + 1, CELL + 1);
  }
  ctx.globalAlpha = 1;

  // 第2层：不均匀暗色（塑料皱缩导致有些地方厚、有些地方薄）
  for (const b of beads) {
    const dx = b.x - centerX;
    const dy = b.y - centerY;
    const shrink = 0.55 + seededRandom(b.x, b.y, 1) * 0.15;
    const nx = centerX + dx * shrink;
    const ny = centerY + dy * shrink;
    const px = ox + nx * CELL;
    const py = oy + ny * CELL;

    const darkness = 0.1 + seededRandom(b.x, b.y, 4) * 0.2;
    ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
    ctx.fillRect(px, py, CELL, CELL);
  }

  // 第3层：皱褶纹路（塑料片皱缩时形成的褶皱线）
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const startIdx = Math.floor(seededRandom(i, 0, 30) * beads.length) % beads.length;
    const sb = beads[startIdx];
    const sdx = sb.x - centerX;
    const sdy = sb.y - centerY;
    const ss = 0.55 + seededRandom(sb.x, sb.y, 1) * 0.15;
    const sx = ox + (centerX + sdx * ss) * CELL + CELL / 2;
    const sy = oy + (centerY + sdy * ss) * CELL + CELL / 2;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    // 画2-3段曲线形成皱褶
    for (let j = 1; j <= 3; j++) {
      const angle = seededRandom(i, j, 31) * Math.PI * 2;
      const len = 8 + seededRandom(i, j, 32) * 15;
      ctx.lineTo(sx + Math.cos(angle) * len * j, sy + Math.sin(angle) * len * j);
    }
    ctx.stroke();
  }

  // 第4层：边缘翘曲效果（收缩后的塑料片边缘不平整）
  // 找到收缩后的边缘豆子，画半透明阴影
  const beadSet = new Set(beads.map(b => `${b.x},${b.y}`));
  for (const b of beads) {
    const neighbors = [
      [b.x - 1, b.y], [b.x + 1, b.y],
      [b.x, b.y - 1], [b.x, b.y + 1],
    ];
    const isEdge = neighbors.some(([nx, ny]) => !beadSet.has(`${nx},${ny}`));
    if (!isEdge) continue;

    const dx = b.x - centerX;
    const dy = b.y - centerY;
    const shrink = 0.55 + seededRandom(b.x, b.y, 1) * 0.15;
    const nx = centerX + dx * shrink;
    const ny = centerY + dy * shrink;
    const px = ox + nx * CELL + CELL / 2;
    const py = oy + ny * CELL + CELL / 2;

    // 翘曲阴影
    const warpAngle = Math.atan2(dy, dx);
    const warpDist = 2 + seededRandom(b.x, b.y, 5) * 3;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(
      px + Math.cos(warpAngle) * warpDist,
      py + Math.sin(warpAngle) * warpDist,
      CELL * 0.6, CELL * 0.3,
      warpAngle, 0, Math.PI * 2,
    );
    ctx.fill();
  }
}

// ====== 颜色烧焦：完全融合（比成功更烫）+ 颜色变焦 + 焦痕 + 烟雾 ======
function drawBurned(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  // 第1层：完全融合的方块底色（烧焦=比成功更热，颜色已在 FailureEngine 里变暗）
  for (const b of beads) {
    ctx.fillStyle = b.color;
    ctx.fillRect(ox + b.x * CELL - 0.5, oy + b.y * CELL - 0.5, CELL + 1, CELL + 1);
  }

  // 第2层：不均匀烧焦暗块（有些地方烧得更厉害）
  for (const b of beads) {
    const darkness = 0.1 + seededRandom(b.x, b.y, 3) * 0.25;
    ctx.fillStyle = `rgba(20, 10, 0, ${darkness})`;
    ctx.fillRect(ox + b.x * CELL, oy + b.y * CELL, CELL, CELL);
  }

  // 第3层：焦痕斑点（较大、较深、较明显）
  for (const b of beads) {
    const cx = ox + b.x * CELL + CELL / 2;
    const cy = oy + b.y * CELL + CELL / 2;
    const spotCount = 2 + Math.floor(seededRandom(b.x, b.y, 1) * 3);
    for (let s = 0; s < spotCount; s++) {
      const sr = seededRandom(b.x, b.y, s + 5);
      const sa = seededRandom(b.x, b.y, s + 8) * Math.PI * 2;
      const sd = sr * (CELL * 0.4);
      ctx.fillStyle = `rgba(15, 8, 0, ${0.25 + sr * 0.35})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(sa) * sd, cy + Math.sin(sa) * sd, 2 + sr * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 第4层：边缘焦黑（整片的边缘更容易烧焦）
  const minX = Math.min(...beads.map(b => b.x));
  const maxX = Math.max(...beads.map(b => b.x));
  const minY = Math.min(...beads.map(b => b.y));
  const maxY = Math.max(...beads.map(b => b.y));
  for (const b of beads) {
    // 越靠近边缘越焦
    const edgeDist = Math.min(b.x - minX, maxX - b.x, b.y - minY, maxY - b.y);
    if (edgeDist <= 1) {
      const edgeBurn = edgeDist === 0 ? 0.3 : 0.15;
      ctx.fillStyle = `rgba(0, 0, 0, ${edgeBurn})`;
      ctx.fillRect(ox + b.x * CELL, oy + b.y * CELL, CELL, CELL);
    }
  }

  // 第5层：烟雾效果（更多、更大）
  for (let i = 0; i < 12; i++) {
    const idx = Math.floor(seededRandom(i, 0, 20) * beads.length) % beads.length;
    const refBead = beads[idx];
    if (!refBead) continue;
    const smokeX = ox + refBead.x * CELL + CELL / 2 + (seededRandom(i, 3, 23) - 0.5) * CELL;
    const smokeY = oy + refBead.y * CELL - seededRandom(i, 1, 21) * 20 - 5;
    const smokeR = 6 + seededRandom(i, 2, 22) * 12;
    const gradient = ctx.createRadialGradient(smokeX, smokeY, 0, smokeX, smokeY, smokeR);
    gradient.addColorStop(0, 'rgba(60, 60, 60, 0.2)');
    gradient.addColorStop(0.6, 'rgba(80, 80, 80, 0.08)');
    gradient.addColorStop(1, 'rgba(80, 80, 80, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(smokeX, smokeY, smokeR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ====== 粘连拉扯：完全融合的整片被揭开时像牛皮糖一样整体拉扯 ======
function drawSticky(ctx: CanvasRenderingContext2D, beads: Bead[], ox: number, oy: number) {
  // 建立位置索引
  const beadSet = new Set<string>();
  for (const b of beads) beadSet.add(`${b.x},${b.y}`);

  // 确定一个统一的拉扯方向（模拟从某个角揭开）
  const pullAngle = seededRandom(3, 7, 42) * Math.PI * 2;
  const pullDirX = Math.cos(pullAngle);
  const pullDirY = Math.sin(pullAngle);

  // 计算每颗豆子的拉扯强度（基于位置在拉扯方向上的投影）
  let minProj = Infinity, maxProj = -Infinity;
  const projections = new Map<string, number>();
  for (const b of beads) {
    const proj = b.x * pullDirX + b.y * pullDirY;
    projections.set(`${b.x},${b.y}`, proj);
    if (proj < minProj) minProj = proj;
    if (proj > maxProj) maxProj = proj;
  }
  const projRange = maxProj - minProj || 1;

  // 第一步：计算原始 intensity
  type DisplacedBead = { bead: Bead; dx: number; dy: number; intensity: number };
  const rawIntensityMap = new Map<string, number>();
  for (const b of beads) {
    const proj = projections.get(`${b.x},${b.y}`) ?? 0;
    const t = (proj - minProj) / projRange;
    const noise = seededRandom(b.x, b.y, 1) * 0.05;
    rawIntensityMap.set(`${b.x},${b.y}`, Math.max(0, t * t + noise - 0.15));
  }

  // 平滑处理：模拟连续片材约束
  for (let pass = 0; pass < 3; pass++) {
    const smoothed = new Map<string, number>();
    for (const b of beads) {
      const key = `${b.x},${b.y}`;
      const self = rawIntensityMap.get(key) ?? 0;
      let sum = self * 2;
      let count = 2;
      for (const [nx, ny] of [[b.x-1,b.y],[b.x+1,b.y],[b.x,b.y-1],[b.x,b.y+1]]) {
        const nk = `${nx},${ny}`;
        if (rawIntensityMap.has(nk)) {
          sum += rawIntensityMap.get(nk)!;
          count++;
        }
      }
      smoothed.set(key, sum / count);
    }
    for (const [k, v] of smoothed) rawIntensityMap.set(k, v);
  }

  // 第二步：用平滑后的 intensity 计算位移
  const displaced: DisplacedBead[] = [];
  const displaceMap = new Map<string, DisplacedBead>();

  for (const b of beads) {
    const intensity = rawIntensityMap.get(`${b.x},${b.y}`) ?? 0;

    const maxDisplace = CELL * 1.5;
    const perpNoise = (seededRandom(b.x, b.y, 2) - 0.5) * CELL * 0.12 * intensity;
    const dx = pullDirX * intensity * maxDisplace + (-pullDirY) * perpNoise;
    const dy = pullDirY * intensity * maxDisplace + pullDirX * perpNoise;

    const d: DisplacedBead = { bead: b, dx, dy, intensity };
    displaced.push(d);
    displaceMap.set(`${b.x},${b.y}`, d);
  }

  // 第1层：撕裂边界拉丝（只在位移差大的相邻豆子之间）
  ctx.lineCap = 'round';
  for (const d of displaced) {
    if (d.intensity < 0.1) continue;
    const b = d.bead;

    for (const [nx, ny] of [[b.x + 1, b.y], [b.x, b.y + 1]] as [number, number][]) {
      const nd = displaceMap.get(`${nx},${ny}`);
      if (!nd) continue;

      const ddx = d.dx - nd.dx;
      const ddy = d.dy - nd.dy;
      const displaceDiff = Math.sqrt(ddx * ddx + ddy * ddy);
      if (displaceDiff < CELL * 0.3) continue;

      const [highD, lowD] = d.intensity >= nd.intensity ? [d, nd] : [nd, d];
      const strandCount = Math.round(2 + (displaceDiff / (CELL * 3)) * 3);

      for (let s = 0; s < strandCount; s++) {
        const randOff = (seededRandom(b.x + nx, b.y + ny, s + 50) - 0.5);
        const fromCx = ox + lowD.bead.x * CELL + CELL / 2 + lowD.dx;
        const fromCy = oy + lowD.bead.y * CELL + CELL / 2 + lowD.dy;
        const toCx = ox + highD.bead.x * CELL + CELL / 2 + highD.dx + randOff * CELL * 0.3;
        const toCy = oy + highD.bead.y * CELL + CELL / 2 + highD.dy + randOff * CELL * 0.3;

        const baseWidth = CELL * 0.3 * Math.min(1, displaceDiff / (CELL * 2));
        ctx.strokeStyle = lowD.bead.color;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = baseWidth;

        const ctrlX = (fromCx + toCx) / 2 + randOff * CELL * 0.5;
        const ctrlY = (fromCy + toCy) / 2 + randOff * CELL * 0.5;
        ctx.beginPath();
        ctx.moveTo(fromCx, fromCy);
        ctx.quadraticCurveTo(ctrlX, ctrlY, toCx, toCy);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;

  // 第2层：画所有豆子（整片融合 + 重叠方块，无 rotate/scale 变换）
  for (const d of displaced) {
    const b = d.bead;
    const cx = ox + b.x * CELL + CELL / 2 + d.dx;
    const cy = oy + b.y * CELL + CELL / 2 + d.dy;

    ctx.fillStyle = b.color;
    // 只有极端拉薄时轻微降低不透明度
    ctx.globalAlpha = d.intensity > 0.9
      ? Math.max(0.3, 1 - (d.intensity - 0.9) * 3)
      : 1;
    // 动态 overlap：intensity 越高，相邻位移差越大，需要更大重叠
    const overlap = 1.5 + d.intensity * CELL * 0.3;
    ctx.fillRect(
      cx - CELL / 2 - overlap,
      cy - CELL / 2 - overlap,
      CELL + overlap * 2,
      CELL + overlap * 2,
    );
  }
  ctx.globalAlpha = 1;

  // 高光条纹已移除（在融合片材上画per-bead线条会产生不自然的斜线条纹）
}
