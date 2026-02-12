/**
 * 十字交叉切片服务
 * 体素数据 → 十字切片 → 带卡槽的2D像素图纸
 *
 * 切片方式：
 * - X方向切片：沿X轴取YZ平面（左右切）
 * - Z方向切片：沿Z轴取XY平面（前后切）
 * - 交叉处生成互锁卡槽
 */

import { VoxelGrid } from './modelVoxelizeService';

/** 卡槽信息 */
export interface SlotInfo {
  col: number;       // 卡槽所在列
  fromTop: boolean;  // true=从上往下开槽，false=从下往上
  depth: number;     // 槽深（像素行数，高度的一半）
}

/** 单个切片 */
export interface SlicePiece {
  id: string;            // 如 "X-3" 或 "Z-5"
  direction: 'X' | 'Z'; // 切片方向
  position: number;      // 在该方向的位置索引
  width: number;         // 片的宽度（珠子数）
  height: number;        // 片的高度（珠子数）
  pixels: (string | null)[][]; // [row][col] = color or null，row 0 = 顶部
  slots: SlotInfo[];     // 卡槽位置信息
}

/** 切片配置 */
export interface SliceConfig {
  slicesX: number;  // X方向切片数量
  slicesZ: number;  // Z方向切片数量
  slotWidth: number; // 卡槽宽度（珠子数），默认1
}

/**
 * 生成十字交叉切片
 */
export function generateCrossSlices(
  grid: VoxelGrid,
  config: SliceConfig
): SlicePiece[] {
  const { slicesX, slicesZ, slotWidth = 1 } = config;
  const pieces: SlicePiece[] = [];

  // 计算切片位置（等间距）
  const xPositions = calculateSlicePositions(grid.sizeX, slicesX);
  const zPositions = calculateSlicePositions(grid.sizeZ, slicesZ);

  // 生成 X 方向切片（取 YZ 平面）
  for (let i = 0; i < xPositions.length; i++) {
    const xPos = xPositions[i];
    const slice = extractXSlice(grid, xPos);

    // X方向片的卡槽：在与Z方向片的交叉处，从底部开槽
    const slots: SlotInfo[] = [];
    for (const zPos of zPositions) {
      slots.push({
        col: zPos,
        fromTop: false, // X方向片从底部开槽
        depth: Math.ceil(grid.sizeY / 2),
      });
    }

    // 应用卡槽到像素数据
    const pixelsWithSlots = applySlots(slice.pixels, slots, slotWidth);

    pieces.push({
      id: `X-${i + 1}`,
      direction: 'X',
      position: xPos,
      width: slice.width,
      height: slice.height,
      pixels: pixelsWithSlots,
      slots,
    });
  }

  // 生成 Z 方向切片（取 XY 平面）
  for (let i = 0; i < zPositions.length; i++) {
    const zPos = zPositions[i];
    const slice = extractZSlice(grid, zPos);

    // Z方向片的卡槽：在与X方向片的交叉处，从顶部开槽
    const slots: SlotInfo[] = [];
    for (const xPos of xPositions) {
      slots.push({
        col: xPos,
        fromTop: true, // Z方向片从顶部开槽
        depth: Math.ceil(grid.sizeY / 2),
      });
    }

    // 应用卡槽到像素数据
    const pixelsWithSlots = applySlots(slice.pixels, slots, slotWidth);

    pieces.push({
      id: `Z-${i + 1}`,
      direction: 'Z',
      position: zPos,
      width: slice.width,
      height: slice.height,
      pixels: pixelsWithSlots,
      slots,
    });
  }

  return pieces;
}

/**
 * 计算等间距切片位置
 */
function calculateSlicePositions(totalSize: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Math.floor(totalSize / 2)];

  const positions: number[] = [];
  const step = totalSize / (count + 1);
  for (let i = 1; i <= count; i++) {
    positions.push(Math.round(step * i));
  }
  // 确保不越界
  return positions.map(p => Math.min(p, totalSize - 1)).filter((v, i, arr) => arr.indexOf(v) === i);
}

/**
 * 提取 X 方向切片（取 x=xPos 处的 YZ 平面）
 * 返回 pixels[row][col]，row=0 对应 Y 最高（顶部），col 对应 Z 方向
 */
function extractXSlice(
  grid: VoxelGrid,
  xPos: number
): { width: number; height: number; pixels: (string | null)[][] } {
  const width = grid.sizeZ;   // 列方向 = Z
  const height = grid.sizeY;  // 行方向 = Y

  const pixels: (string | null)[][] = [];
  for (let row = 0; row < height; row++) {
    const y = height - 1 - row; // row 0 = Y 最高
    const rowData: (string | null)[] = [];
    for (let col = 0; col < width; col++) {
      rowData.push(grid.data[xPos]?.[y]?.[col] ?? null);
    }
    pixels.push(rowData);
  }

  return { width, height, pixels };
}

/**
 * 提取 Z 方向切片（取 z=zPos 处的 XY 平面）
 * 返回 pixels[row][col]，row=0 对应 Y 最高（顶部），col 对应 X 方向
 */
function extractZSlice(
  grid: VoxelGrid,
  zPos: number
): { width: number; height: number; pixels: (string | null)[][] } {
  const width = grid.sizeX;   // 列方向 = X
  const height = grid.sizeY;  // 行方向 = Y

  const pixels: (string | null)[][] = [];
  for (let row = 0; row < height; row++) {
    const y = height - 1 - row; // row 0 = Y 最高
    const rowData: (string | null)[] = [];
    for (let col = 0; col < width; col++) {
      rowData.push(grid.data[col]?.[y]?.[zPos] ?? null);
    }
    pixels.push(rowData);
  }

  return { width, height, pixels };
}

/**
 * 在切片像素数据中应用卡槽（把卡槽区域设为 null）
 */
function applySlots(
  pixels: (string | null)[][],
  slots: SlotInfo[],
  slotWidth: number
): (string | null)[][] {
  const height = pixels.length;
  if (height === 0) return pixels;

  // 深拷贝像素数据
  const result = pixels.map(row => [...row]);

  for (const slot of slots) {
    const halfCol = Math.floor(slotWidth / 2);
    const colStart = Math.max(0, slot.col - halfCol);
    const colEnd = Math.min(result[0]?.length ?? 0, slot.col + halfCol + 1);

    if (slot.fromTop) {
      // 从顶部开槽
      for (let row = 0; row < slot.depth && row < height; row++) {
        for (let col = colStart; col < colEnd; col++) {
          result[row][col] = null;
        }
      }
    } else {
      // 从底部开槽
      for (let row = height - 1; row >= height - slot.depth && row >= 0; row--) {
        for (let col = colStart; col < colEnd; col++) {
          result[row][col] = null;
        }
      }
    }
  }

  return result;
}

/**
 * 将切片渲染为 Canvas 图像
 */
export function renderSliceToCanvas(
  piece: SlicePiece,
  cellSize: number = 12,
  showGrid: boolean = true,
  showSlotMarkers: boolean = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = piece.width * cellSize;
  canvas.height = piece.height * cellSize;

  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制像素
  for (let row = 0; row < piece.height; row++) {
    for (let col = 0; col < piece.width; col++) {
      const color = piece.pixels[row]?.[col];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }

  // 绘制卡槽标记
  if (showSlotMarkers) {
    for (const slot of piece.slots) {
      const halfCol = Math.floor(1 / 2); // slotWidth默认1
      const colStart = Math.max(0, slot.col - halfCol);
      const colEnd = Math.min(piece.width, slot.col + halfCol + 1);

      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);

      if (slot.fromTop) {
        const x = colStart * cellSize;
        const w = (colEnd - colStart) * cellSize;
        const h = slot.depth * cellSize;
        ctx.strokeRect(x, 0, w, h);
      } else {
        const x = colStart * cellSize;
        const w = (colEnd - colStart) * cellSize;
        const h = slot.depth * cellSize;
        const y = canvas.height - h;
        ctx.strokeRect(x, y, w, h);
      }

      ctx.setLineDash([]);
    }
  }

  // 绘制网格
  if (showGrid) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= piece.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= piece.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }

    // 粗网格线（每5格）
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    for (let x = 0; x <= piece.width; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= piece.height; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }
  }

  // 绘制标签
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 60, 22);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(piece.id, 5, 15);

  return canvas;
}

/**
 * 导出切片为图片
 */
export function exportSliceAsImage(
  piece: SlicePiece,
  cellSize: number = 12
): string {
  const canvas = renderSliceToCanvas(piece, cellSize);
  return canvas.toDataURL('image/png');
}

/**
 * 导出所有切片为图片
 */
export function exportAllSlicesAsImages(
  pieces: SlicePiece[],
  cellSize: number = 12
): { id: string; dataUrl: string }[] {
  return pieces.map(piece => ({
    id: piece.id,
    dataUrl: exportSliceAsImage(piece, cellSize),
  }));
}

/**
 * 计算切片统计信息
 */
export function getSliceStats(pieces: SlicePiece[]): {
  totalPieces: number;
  xPieces: number;
  zPieces: number;
  totalBeads: number;
  maxWidth: number;
  maxHeight: number;
} {
  let totalBeads = 0;
  let maxWidth = 0;
  let maxHeight = 0;
  let xPieces = 0;
  let zPieces = 0;

  for (const piece of pieces) {
    if (piece.direction === 'X') xPieces++;
    else zPieces++;

    maxWidth = Math.max(maxWidth, piece.width);
    maxHeight = Math.max(maxHeight, piece.height);

    for (const row of piece.pixels) {
      for (const cell of row) {
        if (cell !== null) totalBeads++;
      }
    }
  }

  return {
    totalPieces: pieces.length,
    xPieces,
    zPieces,
    totalBeads,
    maxWidth,
    maxHeight,
  };
}
