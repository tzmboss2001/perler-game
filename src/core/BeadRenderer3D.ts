/**
 * BeadRenderer3D - 3D拼豆渲染器
 * 通过2D Canvas多层渐变模拟真实拼豆的短圆柱+中心孔（环面/甜甜圈）外观
 * 包含光影、深度、材质质感
 */

import { beadSpec } from './beadSpec';

// OffscreenCanvas 缓存
const beadCache = new Map<string, OffscreenCanvas>();
let cachedCellSize = 0;

/** 解析 hex 颜色为 RGB */
function parseHex(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** RGB 转 rgba 字符串 */
function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`;
}

/** 颜色加深 */
function darken(r: number, g: number, b: number, amount: number): [number, number, number] {
  const factor = 1 - amount;
  return [
    Math.round(r * factor),
    Math.round(g * factor),
    Math.round(b * factor),
  ];
}

/** 颜色加亮 */
function lighten(r: number, g: number, b: number, amount: number): [number, number, number] {
  return [
    Math.round(r + (255 - r) * amount),
    Math.round(g + (255 - g) * amount),
    Math.round(b + (255 - b) * amount),
  ];
}

export interface Bead3DOptions {
  /** 0~1 中孔可见度（融合后消失），默认 1 */
  holeVisible?: number;
  /** 0~1 扁平度（融合后变平），默认 0 */
  flatness?: number;
}

/**
 * 在指定 ctx 上绘制一颗3D拼豆
 * @param ctx Canvas 上下文
 * @param cx 中心 X
 * @param cy 中心 Y
 * @param color hex 颜色
 * @param cell 格子像素大小
 * @param options 可选参数
 */
export function drawBead3D(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  cell: number,
  options?: Bead3DOptions,
): void {
  const holeVisible = options?.holeVisible ?? 1;
  const flatness = options?.flatness ?? 0;

  const { beadR, holeR } = beadSpec(cell);
  const [r, g, b] = parseHex(color);

  // LOD: 极小尺寸用纯色
  if (cell < 8) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, beadR, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // LOD: 小尺寸简化3层
  if (cell < 16) {
    drawBead3DSimple(ctx, cx, cy, color, beadR, holeR, r, g, b, holeVisible);
    return;
  }

  // === 完整7层3D渲染 ===
  // flatness 影响立体感强度
  const depth = 1 - flatness;

  // --- 层1: 底部投影 ---
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${0.3 * depth})`;
  ctx.shadowBlur = 4 * depth;
  ctx.shadowOffsetX = 1 * depth;
  ctx.shadowOffsetY = 2 * depth;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, beadR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // --- 层2: 外圈暗环（圆柱侧面） ---
  const [dr, dg, db] = darken(r, g, b, 0.35);
  const edgeGrad = ctx.createRadialGradient(cx, cy, beadR * 0.65, cx, cy, beadR);
  edgeGrad.addColorStop(0, rgba(r, g, b, 0));
  edgeGrad.addColorStop(0.5, rgba(dr, dg, db, 0.3 * depth));
  edgeGrad.addColorStop(1, rgba(dr, dg, db, 0.6 * depth));
  ctx.fillStyle = edgeGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, beadR, 0, Math.PI * 2);
  ctx.fill();

  // --- 层3: 主体色（顶面弧度，光源左上） ---
  const lightOffX = -beadR * 0.15;
  const lightOffY = -beadR * 0.15;
  const [lr, lg, lb] = lighten(r, g, b, 0.15);
  const bodyGrad = ctx.createRadialGradient(
    cx + lightOffX, cy + lightOffY, 0,
    cx, cy, beadR * 0.85,
  );
  bodyGrad.addColorStop(0, rgba(lr, lg, lb, 0.6 * depth));
  bodyGrad.addColorStop(0.7, rgba(r, g, b, 0));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, beadR, 0, Math.PI * 2);
  ctx.fill();

  // --- 层4 & 5: 中孔深度 ---
  if (holeVisible > 0.01) {
    const holeAlpha = holeVisible;
    const effectiveHoleR = holeR * holeVisible;

    if (effectiveHoleR > 0.5) {
      // 层4: 中孔底色（深暗色）
      ctx.fillStyle = `rgba(15,20,40,${0.85 * holeAlpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, effectiveHoleR, 0, Math.PI * 2);
      ctx.fill();

      // 层5: 中孔内壁环形渐变（孔边缘→内部更暗）
      const innerWallGrad = ctx.createRadialGradient(
        cx, cy, effectiveHoleR * 0.3,
        cx, cy, effectiveHoleR + beadR * 0.15,
      );
      innerWallGrad.addColorStop(0, `rgba(5,8,20,${0.4 * holeAlpha})`);
      innerWallGrad.addColorStop(0.6, `rgba(0,0,0,${0.25 * holeAlpha * depth})`);
      innerWallGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = innerWallGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, effectiveHoleR + beadR * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- 层6: 环面高光（塑料光泽，左上偏移） ---
  const hlOffX = -beadR * 0.28;
  const hlOffY = -beadR * 0.28;
  const hlGrad = ctx.createRadialGradient(
    cx + hlOffX, cy + hlOffY, 0,
    cx + hlOffX, cy + hlOffY, beadR * 0.38,
  );
  hlGrad.addColorStop(0, `rgba(255,255,255,${0.35 * depth})`);
  hlGrad.addColorStop(0.5, `rgba(255,255,255,${0.12 * depth})`);
  hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  ctx.arc(cx + hlOffX, cy + hlOffY, beadR * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // --- 层7: 边缘光（右下侧环境光反弹） ---
  if (depth > 0.3) {
    const rimOffX = beadR * 0.25;
    const rimOffY = beadR * 0.25;
    const rimGrad = ctx.createRadialGradient(
      cx + rimOffX, cy + rimOffY, beadR * 0.6,
      cx + rimOffX, cy + rimOffY, beadR * 1.0,
    );
    rimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    rimGrad.addColorStop(0.5, `rgba(255,255,255,${0.08 * depth})`);
    rimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, beadR, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 简化3层渲染（cell 8~15px） */
function drawBead3DSimple(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  color: string,
  beadR: number, holeR: number,
  r: number, g: number, b: number,
  holeVisible: number,
): void {
  // 层1: 主体渐变
  const [dr, dg, db] = darken(r, g, b, 0.25);
  const [lr, lg, lb] = lighten(r, g, b, 0.12);
  const grad = ctx.createRadialGradient(cx - beadR * 0.15, cy - beadR * 0.15, 0, cx, cy, beadR);
  grad.addColorStop(0, rgba(lr, lg, lb, 1));
  grad.addColorStop(0.7, color);
  grad.addColorStop(1, rgba(dr, dg, db, 1));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, beadR, 0, Math.PI * 2);
  ctx.fill();

  // 层2: 中孔
  if (holeVisible > 0.01) {
    const effectiveHoleR = holeR * holeVisible;
    if (effectiveHoleR > 0.5) {
      ctx.fillStyle = `rgba(15,20,40,${0.8 * holeVisible})`;
      ctx.beginPath();
      ctx.arc(cx, cy, effectiveHoleR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 层3: 高光
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(cx - beadR * 0.25, cy - beadR * 0.25, beadR * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 获取指定颜色+尺寸的3D豆子预渲染缓存图
 * 使用 OffscreenCanvas 惰性缓存，复用 drawImage 绘制
 */
export function getBeadImage(color: string, cell: number): OffscreenCanvas {
  // cell 变化时清除旧缓存
  if (cachedCellSize !== cell) {
    beadCache.clear();
    cachedCellSize = cell;
  }

  const key = `${color}_${cell}`;
  const cached = beadCache.get(key);
  if (cached) return cached;

  // 预渲染到 OffscreenCanvas（尺寸留余量给阴影）
  const padding = 8;
  const size = cell + padding;
  const oc = new OffscreenCanvas(size, size);
  const octx = oc.getContext('2d');
  if (!octx) {
    // fallback: 返回空 canvas
    return oc;
  }

  const center = size / 2;
  drawBead3D(octx as unknown as CanvasRenderingContext2D, center, center, color, cell);

  beadCache.set(key, oc);
  return oc;
}

/** 清除缓存（场景切换时调用） */
export function clearBeadCache(): void {
  beadCache.clear();
  cachedCellSize = 0;
}

/**
 * 使用缓存图绘制3D豆子（最高性能方式）
 * @param ctx 目标 Canvas 上下文
 * @param cx 豆子中心 X
 * @param cy 豆子中心 Y
 * @param color hex 颜色
 * @param cell 格子像素大小
 */
export function drawBeadCached(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  cell: number,
): void {
  const img = getBeadImage(color, cell);
  const hw = img.width / 2;
  const hh = img.height / 2;
  ctx.drawImage(img, cx - hw, cy - hh);
}
