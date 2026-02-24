/**
 * ContinuousRenderer - 连续渐变渲染模块
 * 根据 IroningPhysics 连续参数绘制拼豆效果，取代离散的失败类型渲染
 */

import type { Bead, IroningPhysics } from '@/types/game';
import { beadSpec, PEG_R_RATIO } from '@/core/beadSpec';
import { drawBead3D } from '@/core/BeadRenderer3D';

const DEFAULT_CELL = 18;
const { beadR: DEFAULT_BEAD_R } = beadSpec(DEFAULT_CELL);

/** 渲染尺寸配置（支持分享卡片等不同尺寸场景） */
export interface RenderConfig {
  cell: number;
  beadR: number;
  holeR: number;
}

/** 确定性随机（基于坐标种子） */
function seededRandom(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

/** 限制到 [0, 1] */
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * 对颜色应用烧焦效果
 * burnLevel: 0=原色, 1=焦黑
 */
function applyBurnColor(hex: string, burnLevel: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const darken = 1 - burnLevel * 0.6;
  const burnR = 80, burnG = 40, burnB = 10;
  const mix = burnLevel * 0.5;

  const nr = Math.round(r * darken * (1 - mix) + burnR * mix);
  const ng = Math.round(g * darken * (1 - mix) + burnG * mix);
  const nb = Math.round(b * darken * (1 - mix) + burnB * mix);

  const clampByte = (v: number) => Math.min(255, Math.max(0, v));
  return `#${clampByte(nr).toString(16).padStart(2, '0')}${clampByte(ng).toString(16).padStart(2, '0')}${clampByte(nb).toString(16).padStart(2, '0')}`;
}

/**
 * 混合两个 hex 颜色，返回中间值
 */
function averageColor(hex1: string, hex2: string): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * 绘制圆角矩形路径
 */
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  radius: number,
) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * 主渲染函数：连续渐变绘制
 * @param config 可选的渲染尺寸配置，用于分享卡片等不同尺寸场景
 */
export function drawContinuous(
  ctx: CanvasRenderingContext2D,
  beads: Bead[],
  physics: IroningPhysics,
  ox: number,
  oy: number,
  boardWidth: number,
  boardHeight: number,
  config?: RenderConfig,
) {
  const CELL = config?.cell ?? DEFAULT_CELL;
  const BEAD_R = config?.beadR ?? DEFAULT_BEAD_R;

  const {
    fusion,
    burnLevel,
    collapseAmount,
    stickyStretch,
    heatMap,
  } = physics;

  // 计算中心点（用于坍塌收缩）
  const centerX = boardWidth / 2;
  const centerY = boardHeight / 2;

  // 粘连方向（统一的拉扯方向）
  const pullAngle = seededRandom(3, 7, 42) * Math.PI * 2;
  const pullDirX = Math.cos(pullAngle);
  const pullDirY = Math.sin(pullAngle);

  // 预计算粘连投影
  let minProj = Infinity, maxProj = -Infinity;
  const projections = new Map<string, number>();
  if (stickyStretch > 0.01) {
    for (const b of beads) {
      const proj = b.x * pullDirX + b.y * pullDirY;
      projections.set(`${b.x},${b.y}`, proj);
      if (proj < minProj) minProj = proj;
      if (proj > maxProj) maxProj = proj;
    }
  }
  const projRange = maxProj - minProj || 1;

  // 建立位置索引（用于粘连拉丝）
  const beadSet = new Set<string>();
  for (const b of beads) beadSet.add(`${b.x},${b.y}`);

  // === 预计算每颗豆子的参数 ===
  interface BeadRenderData {
    bead: Bead;
    localFusion: number;
    cx: number; // 最终像素中心坐标
    cy: number;
    dx: number; // 位移量
    dy: number;
    liftScale: number;      // 透视放大（被掀起时离观察者更近）
    stickyIntensity: number;
    color: string;
  }

  const renderData: BeadRenderData[] = [];

  // === 第一步：计算原始 stickyIntensity（粘连前）===
  const rawIntensityMap = new Map<string, number>();
  if (stickyStretch > 0.01) {
    for (const b of beads) {
      const proj = projections.get(`${b.x},${b.y}`) ?? 0;
      const t = (proj - minProj) / projRange;
      const noise = seededRandom(b.x, b.y, 1) * 0.05;
      const raw = Math.max(0, t * t + noise - 0.15) * stickyStretch;
      rawIntensityMap.set(`${b.x},${b.y}`, raw);
    }

    // === 平滑处理：模拟连续片材约束，相邻豆子位移必须平滑 ===
    // 多次迭代平均，确保位移场连续
    for (let pass = 0; pass < 3; pass++) {
      const smoothed = new Map<string, number>();
      for (const b of beads) {
        const key = `${b.x},${b.y}`;
        const self = rawIntensityMap.get(key) ?? 0;
        let sum = self * 2; // 自身权重 x2
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
      // 更新到 rawIntensityMap
      for (const [k, v] of smoothed) rawIntensityMap.set(k, v);
    }
  }

  // === 第二步：用平滑后的 intensity 计算位移和最终参数 ===
  for (const b of beads) {
    // 获取局部热量
    const localHeat = heatMap?.get(`${b.x},${b.y}`) ?? 1;
    // 局部融合度 = 全局融合度 * 局部热量
    const localFusion = clamp01(fusion * (0.3 + localHeat * 0.7));

    // 基础中心坐标
    let pixelCX = ox + b.x * CELL + CELL / 2;
    let pixelCY = oy + b.y * CELL + CELL / 2;
    let dx = 0, dy = 0;
    let liftScale = 1;
    let stickyIntensity = 0;

    // 坍塌收缩位移
    if (collapseAmount > 0.01) {
      const bdx = b.x - centerX;
      const bdy = b.y - centerY;
      const shrink = 1 - collapseAmount * (0.45 + seededRandom(b.x, b.y, 1) * 0.15);
      pixelCX = ox + (centerX + bdx * shrink) * CELL + CELL / 2;
      pixelCY = oy + (centerY + bdy * shrink) * CELL + CELL / 2;
    }

    // 粘连拉伸位移（使用平滑后的 intensity）
    if (stickyStretch > 0.01) {
      stickyIntensity = rawIntensityMap.get(`${b.x},${b.y}`) ?? 0;

      // 大幅位移：整块片材被拉起，沿拉扯方向统一位移
      const maxDisplace = CELL * 5;
      // 垂直噪声大幅降低：真实拉扯沿一个方向，垂直方向只有微弱波动
      const perpNoise = (seededRandom(b.x, b.y, 2) - 0.5) * CELL * 0.12 * stickyIntensity;
      dx = pullDirX * stickyIntensity * maxDisplace + (-pullDirY) * perpNoise;
      dy = pullDirY * stickyIntensity * maxDisplace + pullDirX * perpNoise;
      pixelCX += dx;
      pixelCY += dy;

      // 融合的片材不会缩小，只会位移（保持 liftScale = 1）
      liftScale = 1;
    }

    // 颜色：应用烧焦
    let color = b.color;
    if (burnLevel > 0.01) {
      const localBurn = burnLevel * (0.7 + localHeat * 0.3);
      color = applyBurnColor(color, localBurn);
    }

    renderData.push({
      bead: b,
      localFusion,
      cx: pixelCX,
      cy: pixelCY,
      dx, dy,
      liftScale,
      stickyIntensity,
      color,
    });
  }

  // === 第0层：钉板（片材有明显位移才能看到下面的钉板）===
  if (stickyStretch > 0.1) {
    for (const rd of renderData) {
      if (rd.stickyIntensity < 0.3) continue;
      const origCX = rd.cx - rd.dx;
      const origCY = rd.cy - rd.dy;
      // 豆子被拉走后的空位 — 钉板底色（浅灰绿，高强度时完全可见）
      const pegAlpha = clamp01(rd.stickyIntensity * 1.2);
      ctx.fillStyle = `rgba(170, 190, 180, ${pegAlpha * 0.5})`;
      ctx.fillRect(origCX - CELL / 2, origCY - CELL / 2, CELL, CELL);
      // 钉板钉子（小白圆点）— 高强度时清晰
      const pegR = CELL * PEG_R_RATIO;
      ctx.fillStyle = `rgba(210, 215, 220, ${pegAlpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(origCX, origCY, pegR, 0, Math.PI * 2);
      ctx.fill();
      // 钉子暗影
      ctx.fillStyle = `rgba(100, 110, 120, ${pegAlpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(origCX + 0.5, origCY + 0.5, pegR * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // === 第1层：撕裂边界拉丝（只在相邻豆子位移差大的边界处生成丝条）===
  // 建立坐标→renderData索引，用于快速查找邻居
  const rdMap = new Map<string, BeadRenderData>();
  for (const rd of renderData) rdMap.set(`${rd.bead.x},${rd.bead.y}`, rd);

  if (stickyStretch > 0.1) {
    ctx.lineCap = 'round';

    for (const rd of renderData) {
      if (rd.stickyIntensity < 0.1) continue;
      const b = rd.bead;

      // 检查右侧和下侧邻居（避免重复）
      for (const [nx, ny] of [[b.x + 1, b.y], [b.x, b.y + 1]] as [number, number][]) {
        const nd = rdMap.get(`${nx},${ny}`);
        if (!nd) continue;

        // 计算两个豆子之间的位移差
        const ddx = rd.dx - nd.dx;
        const ddy = rd.dy - nd.dy;
        const displaceDiff = Math.sqrt(ddx * ddx + ddy * ddy);

        // 只在位移差 > CELL*0.3 的边界处画丝条（说明片材在此处被拉伸）
        if (displaceDiff < CELL * 0.3) continue;

        // 确定哪一侧强度更高（被拉得更远）
        const [highRd, lowRd] = rd.stickyIntensity >= nd.stickyIntensity ? [rd, nd] : [nd, rd];

        // 丝条数量：位移差越大，丝条越多（2~5条）
        const strandCount = Math.round(2 + (displaceDiff / (CELL * 3)) * 3);

        for (let s = 0; s < strandCount; s++) {
          const randOff = (seededRandom(b.x + nx, b.y + ny, s + 50) - 0.5);

          // 从低强度侧边缘开始
          const startX = lowRd.cx + (highRd.cx - lowRd.cx) * 0.1;
          const startY = lowRd.cy + (highRd.cy - lowRd.cy) * 0.1;
          // 到高强度侧位置结束
          const endX = highRd.cx + randOff * CELL * 0.3;
          const endY = highRd.cy + randOff * CELL * 0.3;

          // 丝条根部粗（像牛皮糖），末端细
          const baseWidth = CELL * 0.3 * clamp01(displaceDiff / (CELL * 2));
          const tipWidth = Math.max(0.5, baseWidth * 0.1);

          // 使用两端豆子颜色的平均值
          const avgColor = averageColor(lowRd.color, highRd.color);

          // 画从粗到细的贝塞尔丝条
          ctx.strokeStyle = avgColor;
          ctx.globalAlpha = clamp01(0.6 * stickyStretch);

          // 根部宽线
          ctx.lineWidth = baseWidth;
          const ctrlX = (startX + endX) / 2 + randOff * CELL * 0.5;
          const ctrlY = (startY + endY) / 2 + randOff * CELL * 0.5;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.stroke();

          // 末端细线覆盖（模拟粗→细渐变）
          ctx.lineWidth = tipWidth;
          ctx.globalAlpha = clamp01(0.3 * stickyStretch);
          ctx.beginPath();
          ctx.moveTo((startX + endX) / 2, (startY + endY) / 2);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // 高光线
          ctx.lineWidth = Math.max(0.5, tipWidth * 0.6);
          ctx.globalAlpha = 0.15 * stickyStretch;
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // === 第1.5层：整体投影（被拉起的区域沿拉扯方向偏移投影）===
  if (stickyStretch > 0.1) {
    for (const rd of renderData) {
      if (rd.stickyIntensity < 0.15) continue;
      // 投影沿拉扯方向偏移，强度越大偏移越远
      const shadowAlpha = clamp01(0.1 * rd.stickyIntensity * stickyStretch);
      const shadowOff = CELL * 0.2 * rd.stickyIntensity;
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      // 使用与豆子相同大小的重叠方块，形成连续阴影
      const overlap = 1.5;
      ctx.fillRect(
        rd.cx - CELL / 2 - overlap + pullDirX * shadowOff,
        rd.cy - CELL / 2 - overlap + pullDirY * shadowOff,
        CELL + overlap * 2,
        CELL + overlap * 2,
      );
    }
  }

  // === 第2层：绘制每颗豆子 ===
  for (const rd of renderData) {
    const { localFusion, cx, cy, stickyIntensity, color } = rd;

    ctx.save();

    // 粘连模式：整块片材已融合，所有豆子都用全尺寸无缝方块（无中孔、无高光）
    if (stickyStretch > 0.05) {
      // 透明度：只有极端拉薄时轻微降低
      const alpha = stickyIntensity > 0.9
        ? Math.max(0.3, 1 - (stickyIntensity - 0.9) * 3)
        : 1;
      ctx.globalAlpha = alpha;

      ctx.fillStyle = color;
      // 动态 overlap：stickyIntensity 越高需要更大重叠；锚点端也需基础重叠
      const overlap = 1.5 + stickyIntensity * CELL * 0.3;
      ctx.fillRect(
        cx - CELL / 2 - overlap,
        cy - CELL / 2 - overlap,
        CELL + overlap * 2,
        CELL + overlap * 2,
      );
    } else {
      // 非粘连模式
      const alpha = collapseAmount > 0.5 ? 0.85 : 1;
      ctx.globalAlpha = alpha;

      if (localFusion < 0.3) {
        // 低融合度：使用3D渲染，中孔随融合度消失
        drawBead3D(ctx, cx, cy, color, CELL, {
          holeVisible: 1 - localFusion / 0.3,
        });
      } else if (localFusion < 0.7) {
        // 中融合度：3D逐渐扁平化 → 圆角矩形过渡
        const flatness = (localFusion - 0.3) / 0.4;
        drawBead3D(ctx, cx, cy, color, CELL, {
          holeVisible: 0,
          flatness,
        });

        // 叠加圆角矩形扩展效果（从圆形扩展到方块）
        if (flatness > 0.3) {
          // 修正：rectSize 在 fusion=0.7 时要接近 CELL
          const t = localFusion / 0.7; // 0→1
          const rectSize = BEAD_R * 2 + (CELL + 1 - BEAD_R * 2) * t;
          const cornerRadius = BEAD_R * (1 - localFusion);
          ctx.globalAlpha = alpha * (flatness - 0.3) / 0.7;
          ctx.fillStyle = color;
          roundedRectPath(ctx, cx - rectSize / 2, cy - rectSize / 2, rectSize, rectSize, cornerRadius);
          ctx.fill();
          ctx.globalAlpha = alpha;
        }
      } else if (localFusion > 0.85) {
        // 高融合度（0.85+）：完全融合方块（扩大0.5px消除抗锯齿缝隙）
        ctx.fillStyle = color;
        ctx.fillRect(
          cx - CELL / 2 - 0.5,
          cy - CELL / 2 - 0.5,
          CELL + 1,
          CELL + 1,
        );
      } else {
        // 中高融合度（0.7~0.85）：圆角矩形 → 方块（rectSize 必须填满 CELL）
        const t = (localFusion - 0.7) / 0.15; // 0→1 for 0.7→0.85
        const rectSize = CELL + t * 1; // CELL → CELL+1
        const cornerRadius = BEAD_R * (1 - localFusion) * 2; // 圆角逐渐消失
        ctx.fillStyle = color;
        roundedRectPath(ctx, cx - rectSize / 2, cy - rectSize / 2, rectSize, rectSize, cornerRadius);
        ctx.fill();
      }
    }

    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // === 第3层：装饰叠加层 ===
  drawOverlays(ctx, beads, renderData, physics, CELL, boardWidth, boardHeight);
}

/**
 * 装饰叠加层：焦斑、皱褶、拉丝高光等
 */
function drawOverlays(
  ctx: CanvasRenderingContext2D,
  beads: Bead[],
  renderData: { bead: Bead; cx: number; cy: number; stickyIntensity: number; color: string }[],
  physics: IroningPhysics,
  CELL: number,
  boardWidth: number,
  boardHeight: number,
) {
  const { burnLevel, collapseAmount, stickyStretch } = physics;
  const centerX = boardWidth / 2;
  const centerY = boardHeight / 2;

  // === 烧焦效果 ===
  if (burnLevel > 0.1) {
    // 不均匀暗块
    for (const rd of renderData) {
      const darkness = 0.05 + seededRandom(rd.bead.x, rd.bead.y, 3) * 0.15 * burnLevel;
      ctx.fillStyle = `rgba(20, 10, 0, ${darkness})`;
      const s = CELL * 0.8;
      ctx.fillRect(rd.cx - s / 2, rd.cy - s / 2, s, s);
    }

    // 焦斑（数量与 burnLevel 正比）
    const spotCountPerBead = Math.ceil(burnLevel * 3);
    for (const rd of renderData) {
      for (let s = 0; s < spotCountPerBead; s++) {
        const sr = seededRandom(rd.bead.x, rd.bead.y, s + 5);
        const sa = seededRandom(rd.bead.x, rd.bead.y, s + 8) * Math.PI * 2;
        const sd = sr * (CELL * 0.4);
        const spotAlpha = (0.15 + sr * 0.25) * burnLevel;
        const spotR = (1.5 + sr * 2.5) * burnLevel;
        ctx.fillStyle = `rgba(15, 8, 0, ${spotAlpha})`;
        ctx.beginPath();
        ctx.arc(
          rd.cx + Math.cos(sa) * sd,
          rd.cy + Math.sin(sa) * sd,
          spotR, 0, Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // 边缘焦黑
    if (burnLevel > 0.2) {
      const minX = Math.min(...beads.map(b => b.x));
      const maxX = Math.max(...beads.map(b => b.x));
      const minY = Math.min(...beads.map(b => b.y));
      const maxY = Math.max(...beads.map(b => b.y));
      for (const rd of renderData) {
        const edgeDist = Math.min(
          rd.bead.x - minX, maxX - rd.bead.x,
          rd.bead.y - minY, maxY - rd.bead.y,
        );
        if (edgeDist <= 1) {
          const edgeBurn = (edgeDist === 0 ? 0.25 : 0.12) * burnLevel;
          ctx.fillStyle = `rgba(0, 0, 0, ${edgeBurn})`;
          ctx.fillRect(rd.cx - CELL / 2, rd.cy - CELL / 2, CELL, CELL);
        }
      }
    }

    // 烟雾（数量与 burnLevel 正比）
    if (burnLevel > 0.15) {
      const smokeCount = Math.round(4 + burnLevel * 10);
      for (let i = 0; i < smokeCount; i++) {
        const idx = Math.floor(seededRandom(i, 0, 20) * beads.length) % beads.length;
        const rd = renderData[idx];
        if (!rd) continue;
        const smokeX = rd.cx + (seededRandom(i, 3, 23) - 0.5) * CELL;
        const smokeY = rd.cy - seededRandom(i, 1, 21) * 20 - 5;
        const smokeR = (4 + seededRandom(i, 2, 22) * 10) * burnLevel;
        const gradient = ctx.createRadialGradient(smokeX, smokeY, 0, smokeX, smokeY, smokeR);
        gradient.addColorStop(0, `rgba(60, 60, 60, ${0.15 * burnLevel})`);
        gradient.addColorStop(0.6, `rgba(80, 80, 80, ${0.06 * burnLevel})`);
        gradient.addColorStop(1, 'rgba(80, 80, 80, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, smokeR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // === 坍塌效果 ===
  if (collapseAmount > 0.1) {
    // 不均匀暗色（皱缩导致厚薄不均）
    for (const rd of renderData) {
      const darkness = (0.05 + seededRandom(rd.bead.x, rd.bead.y, 4) * 0.15) * collapseAmount;
      ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
      ctx.fillRect(rd.cx - CELL / 2, rd.cy - CELL / 2, CELL, CELL);
    }

    // 皱褶线
    if (collapseAmount > 0.2) {
      const wrinkleCount = Math.round(3 + collapseAmount * 6);
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.15 * collapseAmount})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < wrinkleCount; i++) {
        const startIdx = Math.floor(seededRandom(i, 0, 30) * beads.length) % beads.length;
        const rd = renderData[startIdx];
        if (!rd) continue;

        ctx.beginPath();
        ctx.moveTo(rd.cx, rd.cy);
        for (let j = 1; j <= 3; j++) {
          const angle = seededRandom(i, j, 31) * Math.PI * 2;
          const len = (6 + seededRandom(i, j, 32) * 12) * collapseAmount;
          ctx.lineTo(rd.cx + Math.cos(angle) * len * j, rd.cy + Math.sin(angle) * len * j);
        }
        ctx.stroke();
      }
    }

    // 翘曲阴影
    if (collapseAmount > 0.3) {
      const beadSetLocal = new Set(beads.map(b => `${b.x},${b.y}`));
      for (const rd of renderData) {
        const b = rd.bead;
        const neighbors = [
          [b.x - 1, b.y], [b.x + 1, b.y],
          [b.x, b.y - 1], [b.x, b.y + 1],
        ];
        const isEdge = neighbors.some(([nx, ny]) => !beadSetLocal.has(`${nx},${ny}`));
        if (!isEdge) continue;

        const bdx = b.x - centerX;
        const bdy = b.y - centerY;
        const warpAngle = Math.atan2(bdy, bdx);
        const warpDist = (1.5 + seededRandom(b.x, b.y, 5) * 2.5) * collapseAmount;
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * collapseAmount})`;
        ctx.beginPath();
        ctx.ellipse(
          rd.cx + Math.cos(warpAngle) * warpDist,
          rd.cy + Math.sin(warpAngle) * warpDist,
          CELL * 0.5, CELL * 0.25,
          warpAngle, 0, Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  // 粘连高光条纹已移除（在融合片材上画per-bead线条会产生不自然的斜线条纹）
}
