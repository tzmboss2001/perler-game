/**
 * 等高线镂空切片服务
 * 体素数据 → 水平逐层切片 → 只保留外壳轮廓（镂空）→ 蜈蚣骨架连接
 *
 * 蜈蚣骨架连接系统：
 * - 每对相邻层之间有一个独立的"蜈蚣"连接片（扁平拼豆条）
 * - 蜈蚣竖立放置：身体(spine)在层间作骨架，腿(legs)上下插入两层的预留孔洞
 * - 奇偶连接器交替方向（水平/垂直），使中间层的两组孔不冲突
 */

import { VoxelGrid } from './modelVoxelizeService';

/** 连接策略类型 */
export type ConnectionType = 'centipede' | 'tanghulu' | 'hybrid' | 'none' | 'auto';

/** 模型特征分析 */
export interface ModelAnalysis {
  layerCount: number;
  avgLayerArea: number;
  overlapRatio: number;        // 公共重叠区域占比
  overlapArea: number;
  layerSimilarity: number;     // 相邻层相似度
  isSlender: boolean;          // 是否细长模型
}

/** 智能推荐结果 */
export interface ConnectionRecommendation {
  recommended: ConnectionType;
  confidence: number;
  reason: string;              // 中文推荐理由
  analysis: ModelAnalysis;
}

/** 糖葫芦串槽信息 */
export interface SkewerSlotInfo {
  row: number;
  col: number;
  fromSkewer: string;          // "Skewer-1"
  slotWidth: number;           // 槽宽(默认3)
}

/** 糖葫芦串插条 */
export interface TanghuluSkewer {
  id: string;                  // "Skewer-1"
  position: { row: number; col: number; orientation: 'horizontal' | 'vertical' };
  slotWidth: number;
  layerCount: number;          // 穿过的层数
  width: number;               // 插条像素宽度
  height: number;              // 插条像素高度(=layerCount)
  pixels: (string | null)[][];
  beadCount: number;
}

/** 孔洞位置（蜈蚣腿插入的位置） */
export interface HolePosition {
  row: number;
  col: number;
  fromConnector: string;   // 来自哪个连接器（如 "Conn-1-2"）
  legDirection: 'up' | 'down'; // 腿方向：up=插入上层，down=插入下层
}

/** 蜈蚣连接片 */
export interface CentipedeConnector {
  id: string;                            // "Conn-1-2"
  betweenLayers: [number, number];       // [下层index, 上层index]（在slices数组中的索引）
  orientation: 'horizontal' | 'vertical';
  centerLine: number;                    // 扫描线位置（row或col）
  width: number;
  height: 3;                             // 固定3珠高
  pixels: (string | null)[][];           // 连接片的像素数据
  upperLegPositions: { row: number; col: number }[]; // 上排腿位置（在层坐标系中）
  lowerLegPositions: { row: number; col: number }[]; // 下排腿位置（在层坐标系中）
  beadCount: number;
}

/** 等高线切片 */
export interface ContourSlice {
  id: string;                      // "Layer-1", "Layer-2"...
  layerIndex: number;              // Y层索引（0=底层）
  width: number;                   // XZ平面宽度（col方向=X）
  height: number;                  // XZ平面高度（row方向=Z）
  pixels: (string | null)[][];     // [row][col] = color or null
  holes: HolePosition[];           // 蜈蚣腿孔洞
  skewerSlots: SkewerSlotInfo[];   // 糖葫芦串槽位
  beadCount: number;
  isSolid?: boolean;               // 是否实心层（底层/顶层/太小的层）
}

/** 等高线切片配置 */
export interface ContourSliceConfig {
  shellThickness: number;     // 壳厚度（珠宽）
  connectionType: ConnectionType;  // 连接方式：centipede/tanghulu/hybrid/none/auto
}

/** 等高线切片结果（包含层、连接器和插条） */
export interface ContourSliceResult {
  slices: ContourSlice[];
  connectors: CentipedeConnector[];
  skewers: TanghuluSkewer[];
  recommendation?: ConnectionRecommendation;
}

/** 扫描线与轮廓壳的交叉区段 */
interface CrossingSegment {
  start: number;  // 起始位置（沿扫描线方向）
  end: number;    // 结束位置
}

/**
 * 从 VoxelGrid 提取第 y 层的 XZ 平面
 * 返回 [row][col]，row=Z方向，col=X方向
 */
export function extractHorizontalLayer(
  grid: VoxelGrid,
  y: number
): (string | null)[][] {
  const rows = grid.sizeZ; // row = Z
  const cols = grid.sizeX; // col = X

  const layer: (string | null)[][] = [];
  for (let z = 0; z < rows; z++) {
    const rowData: (string | null)[] = [];
    for (let x = 0; x < cols; x++) {
      rowData.push(grid.data[x]?.[y]?.[z] ?? null);
    }
    layer.push(rowData);
  }
  return layer;
}

/**
 * 扫描线填充：把每行/每列中最左到最右的表面体素之间全部填实
 *
 * 原理：对每一行（水平扫描线），找到该行中最左和最右的非null像素，
 * 将两者之间所有null像素填充为最近表面体素的颜色。
 * 再对每一列（垂直扫描线）做同样操作。
 *
 * 这解决了Y轴射线体素化导致的薄壳问题：
 * 鸭子身体等近水平截面只产生两侧各1px表面体素（开放弧形），
 * 传统BFS洪水填充无法填充开放弧的"内部"，
 * 但扫描线方法可以正确填充每行两侧表面之间的空隙。
 */
export function floodFillLayer(
  layer: (string | null)[][]
): (string | null)[][] {
  const rows = layer.length;
  if (rows === 0) return layer;
  const cols = layer[0].length;
  if (cols === 0) return layer;

  const result = layer.map(row => [...row]);

  // 水平扫描线填充：每行中最左到最右之间填实
  for (let r = 0; r < rows; r++) {
    // 找该行最左非null
    let left = -1;
    for (let c = 0; c < cols; c++) {
      if (result[r][c] !== null) { left = c; break; }
    }
    if (left === -1) continue; // 整行空

    // 找该行最右非null
    let right = -1;
    for (let c = cols - 1; c >= 0; c--) {
      if (result[r][c] !== null) { right = c; break; }
    }

    if (right <= left) continue; // 只有1个像素或相邻

    // 填充left到right之间的空隙
    let lastColor = result[r][left]!;
    for (let c = left + 1; c < right; c++) {
      if (result[r][c] !== null) {
        lastColor = result[r][c]!;
      } else {
        result[r][c] = lastColor;
      }
    }
  }

  // 垂直扫描线填充：每列中最上到最下之间填实
  for (let c = 0; c < cols; c++) {
    let top = -1;
    for (let r = 0; r < rows; r++) {
      if (result[r][c] !== null) { top = r; break; }
    }
    if (top === -1) continue;

    let bottom = -1;
    for (let r = rows - 1; r >= 0; r--) {
      if (result[r][c] !== null) { bottom = r; break; }
    }

    if (bottom <= top) continue;

    let lastColor = result[top][c]!;
    for (let r = top + 1; r < bottom; r++) {
      if (result[r][c] !== null) {
        lastColor = result[r][c]!;
      } else {
        result[r][c] = lastColor;
      }
    }
  }

  return result;
}

/**
 * 从实心层提取外壳轮廓（镂空）
 *
 * 轮廓规则：一个体素是"边缘"，当且仅当：
 * - 它自己有颜色（非null）
 * - 且它的上下左右4邻居中至少一个是null（或越界）
 *
 * 厚度>1时使用多次腐蚀法：保留距边缘N格以内的体素
 */
export function extractContour(
  layer: (string | null)[][],
  thickness: number = 1
): (string | null)[][] {
  const rows = layer.length;
  if (rows === 0) return [];
  const cols = layer[0].length;

  if (thickness < 2) thickness = 2;

  // 构建 filled mask（有颜色的位置）
  const filled: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    filled[r] = [];
    for (let c = 0; c < cols; c++) {
      filled[r][c] = layer[r][c] !== null;
    }
  }

  // 标记哪些位置应该保留（距边缘 thickness 格以内）
  const keep: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    keep[r] = new Array(cols).fill(false);
  }

  let currentFilled = filled.map(row => [...row]);

  for (let t = 0; t < thickness; t++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!currentFilled[r][c]) continue;

        const isEdge =
          r === 0 || r === rows - 1 || c === 0 || c === cols - 1 ||
          !currentFilled[r - 1][c] ||
          !currentFilled[r + 1][c] ||
          !currentFilled[r][c - 1] ||
          !currentFilled[r][c + 1];

        if (isEdge) {
          keep[r][c] = true;
        }
      }
    }

    if (t < thickness - 1) {
      const nextFilled = currentFilled.map(row => [...row]);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (currentFilled[r][c] && keep[r][c]) {
            nextFilled[r][c] = false;
          }
        }
      }
      currentFilled = nextFilled;
    }
  }

  const result: (string | null)[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowData: (string | null)[] = [];
    for (let c = 0; c < cols; c++) {
      if (keep[r][c] && layer[r][c] !== null) {
        rowData.push(layer[r][c]);
      } else {
        rowData.push(null);
      }
    }
    result.push(rowData);
  }

  return result;
}

/**
 * 计算层的填充覆盖范围（宽和高），判断是否足够镂空
 */
function getLayerSpan(layer: (string | null)[][]): number {
  const rows = layer.length;
  if (rows === 0) return 0;
  const cols = layer[0].length;

  let minR = rows, maxR = 0, minC = cols, maxC = 0;
  let hasContent = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (layer[r][c] !== null) {
        hasContent = true;
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }

  if (!hasContent) return 0;

  const spanW = maxC - minC + 1;
  const spanH = maxR - minR + 1;
  return Math.min(spanW, spanH);
}

// ===================== 蜈蚣骨架算法 =====================

/**
 * 计算层的包围盒
 */
function getLayerBounds(layer: (string | null)[][]): {
  minR: number; maxR: number; minC: number; maxC: number;
} | null {
  const rows = layer.length;
  if (rows === 0) return null;
  const cols = layer[0].length;

  let minR = rows, maxR = 0, minC = cols, maxC = 0;
  let hasContent = false;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (layer[r][c] !== null) {
        hasContent = true;
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }

  return hasContent ? { minR, maxR, minC, maxC } : null;
}

/**
 * 沿扫描线找轮廓壳交叉区段
 *
 * orientation='horizontal' 时：固定 row=scanLine，扫描 col 方向
 * orientation='vertical' 时：固定 col=scanLine，扫描 row 方向
 *
 * 返回该扫描线穿过壳体的所有连续区段
 */
function findShellCrossings(
  layer: (string | null)[][],
  scanLine: number,
  orientation: 'horizontal' | 'vertical'
): CrossingSegment[] {
  const rows = layer.length;
  if (rows === 0) return [];
  const cols = layer[0].length;

  const segments: CrossingSegment[] = [];
  let inSegment = false;
  let segStart = 0;

  if (orientation === 'horizontal') {
    // 固定 row=scanLine，扫描 col
    if (scanLine < 0 || scanLine >= rows) return [];
    for (let c = 0; c < cols; c++) {
      const filled = layer[scanLine][c] !== null;
      if (filled && !inSegment) {
        segStart = c;
        inSegment = true;
      } else if (!filled && inSegment) {
        segments.push({ start: segStart, end: c - 1 });
        inSegment = false;
      }
    }
    if (inSegment) {
      segments.push({ start: segStart, end: cols - 1 });
    }
  } else {
    // 固定 col=scanLine，扫描 row
    if (scanLine < 0 || scanLine >= cols) return [];
    for (let r = 0; r < rows; r++) {
      const filled = layer[r][scanLine] !== null;
      if (filled && !inSegment) {
        segStart = r;
        inSegment = true;
      } else if (!filled && inSegment) {
        segments.push({ start: segStart, end: r - 1 });
        inSegment = false;
      }
    }
    if (inSegment) {
      segments.push({ start: segStart, end: rows - 1 });
    }
  }

  return segments;
}

/**
 * 两层交叉区段求交集
 * 确保两层都有壳体的区段才放腿
 */
function intersectCrossings(
  crossingsA: CrossingSegment[],
  crossingsB: CrossingSegment[]
): CrossingSegment[] {
  const result: CrossingSegment[] = [];
  let i = 0, j = 0;

  while (i < crossingsA.length && j < crossingsB.length) {
    const a = crossingsA[i];
    const b = crossingsB[j];

    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);

    if (start <= end) {
      result.push({ start, end });
    }

    // 推进末端较小的那个
    if (a.end < b.end) {
      i++;
    } else {
      j++;
    }
  }

  return result;
}

/**
 * 选择腿位置
 * 在每个交叉段的中点放腿，宽段（>=5）两端也放
 * 避冲突：跳过已被其他连接器占用的位置
 */
function selectLegPositions(
  crossings: CrossingSegment[],
  existingHoles: Set<string>,
  scanLine: number,
  orientation: 'horizontal' | 'vertical'
): { row: number; col: number }[] {
  const positions: { row: number; col: number }[] = [];

  for (const seg of crossings) {
    const segLen = seg.end - seg.start + 1;
    const candidates: number[] = [];

    // 中点
    const mid = Math.round((seg.start + seg.end) / 2);
    candidates.push(mid);

    // 宽段两端也放腿
    if (segLen >= 5) {
      const margin = 1; // 距边缘至少1格
      candidates.push(seg.start + margin);
      candidates.push(seg.end - margin);
    }

    // 更宽的段加更多腿
    if (segLen >= 10) {
      const quarter = Math.round(segLen / 4);
      candidates.push(seg.start + quarter);
      candidates.push(seg.end - quarter);
    }

    // 去重并排序
    const unique = [...new Set(candidates)].sort((a, b) => a - b);

    for (const pos of unique) {
      let row: number, col: number;
      if (orientation === 'horizontal') {
        row = scanLine;
        col = pos;
      } else {
        row = pos;
        col = scanLine;
      }

      const key = `${row},${col}`;
      if (!existingHoles.has(key)) {
        positions.push({ row, col });
        existingHoles.add(key);
      }
    }
  }

  return positions;
}

/**
 * 计算两层公共包围盒中心
 */
function computeCommonCenter(
  layerA: (string | null)[][],
  layerB: (string | null)[][]
): { centerRow: number; centerCol: number } | null {
  const boundsA = getLayerBounds(layerA);
  const boundsB = getLayerBounds(layerB);

  if (!boundsA || !boundsB) return null;

  const minR = Math.min(boundsA.minR, boundsB.minR);
  const maxR = Math.max(boundsA.maxR, boundsB.maxR);
  const minC = Math.min(boundsA.minC, boundsB.minC);
  const maxC = Math.max(boundsA.maxC, boundsB.maxC);

  return {
    centerRow: Math.round((minR + maxR) / 2),
    centerCol: Math.round((minC + maxC) / 2),
  };
}

/**
 * 搜索最佳扫描线
 * 从 preferred 位置开始搜索，找到两层在该扫描线都有足够壳体的位置
 * 避开空洞区域
 */
function findBestScanLine(
  layerA: (string | null)[][],
  layerB: (string | null)[][],
  preferred: number,
  orientation: 'horizontal' | 'vertical',
  maxRange: number
): number {
  let bestLine = preferred;
  let bestCoverage = 0;

  for (let offset = 0; offset <= maxRange; offset++) {
    for (const sign of [0, 1, -1]) {
      if (offset === 0 && sign !== 0) continue;
      const line = preferred + offset * sign;
      if (line < 0) continue;

      const crossA = findShellCrossings(layerA, line, orientation);
      const crossB = findShellCrossings(layerB, line, orientation);
      const intersected = intersectCrossings(crossA, crossB);

      // 计算总覆盖长度
      let coverage = 0;
      for (const seg of intersected) {
        coverage += seg.end - seg.start + 1;
      }

      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestLine = line;
      }
    }
  }

  return bestLine;
}

/**
 * 生成蜈蚣连接片像素
 *
 * 蜈蚣连接片（俯视，扁平拼豆件）：
 * Row 0: ■     ■     ■        ← 上排腿
 * Row 1: ■ ■ ■ ■ ■ ■ ■ ■ ■  ← 身体（脊柱）
 * Row 2: ■     ■     ■        ← 下排腿
 *
 * legPositions 是在"沿扫描线方向"的坐标列表
 * 返回的 pixels 是 3 行 × width 列
 */
function generateCentipedePiece(
  legPositions: { row: number; col: number }[],
  orientation: 'horizontal' | 'vertical',
  scanLine: number
): { pixels: (string | null)[][]; width: number; spineStart: number } {
  if (legPositions.length === 0) {
    return { pixels: [[], [], []], width: 0, spineStart: 0 };
  }

  // 沿扫描线方向的坐标
  const coords = legPositions.map(p =>
    orientation === 'horizontal' ? p.col : p.row
  );
  const minCoord = Math.min(...coords);
  const maxCoord = Math.max(...coords);

  // 脊柱范围：从最左腿到最右腿
  const spineStart = minCoord;
  const spineLen = maxCoord - minCoord + 1;

  // 连接片宽度 = 脊柱长度（至少3）
  const width = Math.max(spineLen, 3);

  const SPINE_COLOR = '#888888';  // 灰色脊柱
  const LEG_COLOR = '#FF8C00';    // 橙色腿

  // 3行 × width列
  const pixels: (string | null)[][] = [
    new Array(width).fill(null),
    new Array(width).fill(null),
    new Array(width).fill(null),
  ];

  // 填充脊柱（Row 1）
  for (let i = 0; i < spineLen; i++) {
    pixels[1][i] = SPINE_COLOR;
  }

  // 填充腿（Row 0 上排 + Row 2 下排），腿位置和上排下排相同
  for (const coord of coords) {
    const idx = coord - spineStart;
    if (idx >= 0 && idx < width) {
      pixels[0][idx] = LEG_COLOR;  // 上排腿
      pixels[2][idx] = LEG_COLOR;  // 下排腿
    }
  }

  return { pixels, width, spineStart };
}

/**
 * 在层上打孔
 * 将腿位置的珠子移除，形成孔洞
 */
function punchHoles(
  layerPixels: (string | null)[][],
  holes: HolePosition[]
): void {
  for (const hole of holes) {
    if (hole.row >= 0 && hole.row < layerPixels.length) {
      if (hole.col >= 0 && hole.col < layerPixels[hole.row].length) {
        layerPixels[hole.row][hole.col] = null;
      }
    }
  }
}

// ===================== 糖葫芦串算法 =====================

/**
 * 计算覆盖率地图
 * 对每个(row, col)位置，统计有多少层在该位置有珠子
 * 用于糖葫芦串放置：不要求100%重叠，只需大多数层有珠子即可
 */
function findCoverageMap(
  layers: (string | null)[][][]
): number[][] {
  if (layers.length === 0) return [];

  const rows = layers[0].length;
  const cols = layers[0][0]?.length ?? 0;

  const coverage: number[][] = [];
  for (let r = 0; r < rows; r++) {
    coverage[r] = [];
    for (let c = 0; c < cols; c++) {
      let count = 0;
      for (const layer of layers) {
        if (layer[r]?.[c]) count++;
      }
      coverage[r][c] = count;
    }
  }

  return coverage;
}

/**
 * 曼哈顿距离变换
 * 计算每个重叠像素到最近非重叠像素的距离
 * 距离越大 = 离边缘越远 = 位置越安全
 */
function computeDistanceTransform(overlap: boolean[][]): number[][] {
  const rows = overlap.length;
  if (rows === 0) return [];
  const cols = overlap[0].length;

  const dist: number[][] = [];
  for (let r = 0; r < rows; r++) {
    dist[r] = [];
    for (let c = 0; c < cols; c++) {
      dist[r][c] = overlap[r][c] ? Infinity : 0;
    }
  }

  // Forward pass (从左上到右下)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dist[r][c] === 0) continue;
      if (r > 0) dist[r][c] = Math.min(dist[r][c], dist[r - 1][c] + 1);
      if (c > 0) dist[r][c] = Math.min(dist[r][c], dist[r][c - 1] + 1);
    }
  }

  // Backward pass (从右下到左上)
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      if (dist[r][c] === 0) continue;
      if (r < rows - 1) dist[r][c] = Math.min(dist[r][c], dist[r + 1][c] + 1);
      if (c < cols - 1) dist[r][c] = Math.min(dist[r][c], dist[r][c + 1] + 1);
    }
  }

  return dist;
}

/**
 * 选择糖葫芦串插条放置位置（基于覆盖率）
 *
 * 核心思路：
 * 1. 用覆盖率地图找到"大多数层都有珠子"的位置（不要求100%）
 * 2. 对合格位置做距离变换，优先选离边缘远的（更稳固）
 * 3. 综合评分 = 覆盖率 × 距离权重
 * 4. 对没有珠子的层，插条直接穿过空间，不需要挖孔
 *
 * @param coverage 覆盖率地图（每个位置有多少层有珠子）
 * @param totalLayers 总层数
 * @param count 需要的插条数量
 * @param slotWidth 槽宽
 * @returns 选中的位置和朝向列表
 */
function selectSkewerPositions(
  coverage: number[][],
  totalLayers: number,
  count: number,
  slotWidth: number
): { row: number; col: number; orientation: 'horizontal' | 'vertical' }[] {
  const rows = coverage.length;
  if (rows === 0) return [];
  const cols = coverage[0].length;

  // 覆盖率阈值：至少覆盖50%的层，且至少3层
  const minCoverage = Math.max(3, Math.ceil(totalLayers * 0.5));

  // 构建布尔掩码：覆盖率 >= 阈值的位置
  const validMask: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    validMask[r] = [];
    for (let c = 0; c < cols; c++) {
      validMask[r][c] = coverage[r][c] >= minCoverage;
    }
  }

  // 对合格区域做距离变换
  const dist = computeDistanceTransform(validMask);

  const halfSlot = Math.ceil(slotWidth / 2);

  // 收集候选位置，综合评分 = 覆盖率比例 × (距离 + 1)
  const candidates: { row: number; col: number; score: number; coverageRate: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dist[r][c] < 1 || coverage[r][c] < minCoverage) continue;
      const coverageRate = coverage[r][c] / totalLayers;
      const score = coverageRate * (dist[r][c] + 1);
      candidates.push({ row: r, col: c, score, coverageRate });
    }
  }

  // 按综合评分降序排列
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return [];

  // 贪心选择
  const selected: { row: number; col: number; orientation: 'horizontal' | 'vertical' }[] = [];
  const minSpacing = Math.max(4, slotWidth * 2);

  for (const cand of candidates) {
    if (selected.length >= count) break;

    let tooClose = false;
    for (const s of selected) {
      const d = Math.abs(cand.row - s.row) + Math.abs(cand.col - s.col);
      if (d < minSpacing) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    // 确定朝向：检查水平和垂直哪个方向有更多连续合格像素
    let hCount = 0, vCount = 0;
    for (let dc = -halfSlot; dc <= halfSlot; dc++) {
      const nc = cand.col + dc;
      if (nc >= 0 && nc < cols && coverage[cand.row][nc] >= minCoverage) hCount++;
    }
    for (let dr = -halfSlot; dr <= halfSlot; dr++) {
      const nr = cand.row + dr;
      if (nr >= 0 && nr < rows && coverage[nr][cand.col] >= minCoverage) vCount++;
    }

    selected.push({
      row: cand.row,
      col: cand.col,
      orientation: hCount >= vCount ? 'vertical' : 'horizontal',
    });
  }

  return selected;
}

/**
 * 计算一层像素中每个珠子到【外部边界】的最短曼哈顿距离
 *
 * 关键区别：只考虑到外部 null 的距离，忽略镂空内部的 null。
 * - 外部 null = 从网格边缘可达的空像素（模型外围）
 * - 内部 null = 被珠子包围的空像素（镂空内部）
 *
 * 这样，壳体内侧的珠子（靠近镂空）仍有较大的外部距离值，
 * 只有真正在模型最外缘的珠子才会得到小值。
 *
 * @returns 2D距离图，dist[r][c] = 该珠子到最近外部空白的距离
 *          null像素的距离为0（无意义），非珠子位置为0
 */
function computeExteriorDistanceMap(
  layerPixels: (string | null)[][]
): number[][] {
  const rows = layerPixels.length;
  const cols = layerPixels[0]?.length ?? 0;

  // Step 1: BFS 从网格边缘标记外部 null（不穿过珠子）
  const isExterior: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    isExterior[r] = new Array(cols).fill(false);
  }

  const queue: number[] = [];

  // 从四条边的 null 像素开始 BFS
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === 0 || r === rows - 1 || c === 0 || c === cols - 1) && layerPixels[r][c] === null) {
        if (!isExterior[r][c]) {
          isExterior[r][c] = true;
          queue.push(r, c);
        }
      }
    }
  }

  let qi = 0;
  while (qi < queue.length) {
    const cr = queue[qi++];
    const cc = queue[qi++];
    const neighbors = [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]];
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
          !isExterior[nr][nc] && layerPixels[nr][nc] === null) {
        isExterior[nr][nc] = true;
        queue.push(nr, nc);
      }
    }
  }

  // Step 2: 曼哈顿距离变换 — 只以外部 null 为源（dist=0）
  // 网格外也算外部，所以边界珠子的距离为1
  const dist: number[][] = [];
  for (let r = 0; r < rows; r++) {
    dist[r] = new Array(cols);
    for (let c = 0; c < cols; c++) {
      if (isExterior[r][c]) {
        dist[r][c] = 0; // 外部 null → 距离源
      } else if (layerPixels[r][c] !== null) {
        dist[r][c] = Infinity; // 珠子 → 待计算
      } else {
        dist[r][c] = Infinity; // 内部 null → 视为远离外部
      }
    }
  }

  // Forward pass: 左上到右下
  // 网格外视为外部(距离0)，所以边界珠子自动得到距离1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dist[r][c] === 0) continue;
      const fromTop = r > 0 ? dist[r - 1][c] + 1 : 1;
      const fromLeft = c > 0 ? dist[r][c - 1] + 1 : 1;
      dist[r][c] = Math.min(dist[r][c], fromTop, fromLeft);
    }
  }

  // Backward pass: 右下到左上
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      if (dist[r][c] === 0) continue;
      const fromBottom = r < rows - 1 ? dist[r + 1][c] + 1 : 1;
      const fromRight = c < cols - 1 ? dist[r][c + 1] + 1 : 1;
      dist[r][c] = Math.min(dist[r][c], fromBottom, fromRight);
    }
  }

  return dist;
}

/**
 * 在层上挖糖葫芦串槽
 * 沿插条方向，在插条位置挖出 slotWidth 个像素的槽
 *
 * 安全检查：使用预计算的外部距离图，如果插孔中心距离模型外部边缘太近
 * （< halfSlot + 1），跳过挖槽。只考虑外部边界，忽略镂空内部。
 * 这样壳体内侧的位置仍然可以挖槽（外部距离大），
 * 只有真正在模型最外缘的位置才会跳过。
 *
 * @param exteriorDist 预计算的外部距离图（computeExteriorDistanceMap 的结果）
 */
function punchSkewerSlot(
  layerPixels: (string | null)[][],
  position: { row: number; col: number; orientation: 'horizontal' | 'vertical' },
  slotWidth: number,
  skewerId: string,
  slice: ContourSlice,
  exteriorDist: number[][]
): void {
  const halfSlot = Math.floor(slotWidth / 2);
  const rows = layerPixels.length;
  const cols = layerPixels[0]?.length ?? 0;

  // 检查中心点是否有珠子
  if (position.row < 0 || position.row >= rows ||
      position.col < 0 || position.col >= cols) return;
  if (layerPixels[position.row][position.col] === null) return;

  // 用外部距离图检查：中心点离模型外部边缘需要足够远
  // halfSlot + 1 = 插槽半径 + 1颗珠子余量
  const extDist = exteriorDist[position.row]?.[position.col] ?? 0;
  if (extDist < halfSlot + 1) {
    // 此位置太靠近模型外部边缘，无法安全挖槽
    // 插条在此层自然穿过，不挖槽
    return;
  }

  if (position.orientation === 'vertical') {
    // 垂直插条：槽是水平方向的（跨col）
    for (let dc = -halfSlot; dc <= halfSlot; dc++) {
      const c = position.col + dc;
      const r = position.row;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        if (layerPixels[r][c] !== null) {
          layerPixels[r][c] = null;
          slice.skewerSlots.push({
            row: r,
            col: c,
            fromSkewer: skewerId,
            slotWidth,
          });
        }
      }
    }
  } else {
    // 水平插条：槽是垂直方向的（跨row）
    for (let dr = -halfSlot; dr <= halfSlot; dr++) {
      const r = position.row + dr;
      const c = position.col;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        if (layerPixels[r][c] !== null) {
          layerPixels[r][c] = null;
          slice.skewerSlots.push({
            row: r,
            col: c,
            fromSkewer: skewerId,
            slotWidth,
          });
        }
      }
    }
  }
}

/**
 * 生成糖葫芦串插条像素数据
 * 插条是一个 slotWidth × layerCount 的矩形拼豆件
 */
function generateSkewerPiece(
  position: { row: number; col: number; orientation: 'horizontal' | 'vertical' },
  layerCount: number,
  slotWidth: number,
  id: string
): TanghuluSkewer {
  const SKEWER_COLOR = '#8B5CF6';  // 紫色主题

  const width = slotWidth;
  const height = layerCount;

  const pixels: (string | null)[][] = [];
  for (let r = 0; r < height; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < width; c++) {
      row.push(SKEWER_COLOR);
    }
    pixels.push(row);
  }

  let beadCount = 0;
  for (const row of pixels) {
    for (const cell of row) {
      if (cell !== null) beadCount++;
    }
  }

  return {
    id,
    position,
    slotWidth,
    layerCount,
    width,
    height,
    pixels,
    beadCount,
  };
}

// ===================== 模型分析 + 智能推荐 =====================

/**
 * 分析模型特征
 * @param slices 已生成的切片
 * @param fullLayers 原始实心层数据
 */
function analyzeModel(
  slices: ContourSlice[],
  fullLayers: (string | null)[][][]
): ModelAnalysis {
  const layerCount = slices.length;

  // 计算每层面积
  const areas: number[] = [];
  for (const layer of fullLayers) {
    let area = 0;
    for (const row of layer) {
      for (const cell of row) {
        if (cell !== null) area++;
      }
    }
    areas.push(area);
  }
  const avgLayerArea = areas.length > 0
    ? areas.reduce((a, b) => a + b, 0) / areas.length
    : 0;

  // 计算公共重叠区域（所有层都有像素的位置）
  const coverageMap = findCoverageMap(fullLayers);
  let overlapArea = 0;
  for (const row of coverageMap) {
    for (const count of row) {
      if (count === fullLayers.length) overlapArea++;
    }
  }
  const overlapRatio = avgLayerArea > 0 ? overlapArea / avgLayerArea : 0;

  // 计算相邻层相似度
  let totalSimilarity = 0;
  let pairCount = 0;
  for (let i = 0; i < fullLayers.length - 1; i++) {
    const layerA = fullLayers[i];
    const layerB = fullLayers[i + 1];
    const rows = layerA.length;
    const cols = layerA[0]?.length ?? 0;

    let both = 0, either = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = layerA[r]?.[c] !== null;
        const b = layerB[r]?.[c] !== null;
        if (a || b) either++;
        if (a && b) both++;
      }
    }
    if (either > 0) {
      totalSimilarity += both / either;
      pairCount++;
    }
  }
  const layerSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;

  // 判断是否细长模型
  const rows = fullLayers[0]?.length ?? 0;
  const cols = fullLayers[0]?.[0]?.length ?? 0;
  let minR = rows, maxR = 0, minC = cols, maxC = 0;
  for (const layer of fullLayers) {
    for (let r = 0; r < layer.length; r++) {
      for (let c = 0; c < (layer[r]?.length ?? 0); c++) {
        if (layer[r][c] !== null) {
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
      }
    }
  }
  const spanW = maxC - minC + 1;
  const spanH = maxR - minR + 1;
  const aspectRatio = Math.max(spanW, spanH) / Math.max(1, Math.min(spanW, spanH));
  const isSlender = aspectRatio > 2.5;

  return {
    layerCount,
    avgLayerArea,
    overlapRatio,
    overlapArea,
    layerSimilarity,
    isSlender,
  };
}

/**
 * 智能推荐连接方式
 */
function recommendConnection(analysis: ModelAnalysis): ConnectionRecommendation {
  const { layerCount, avgLayerArea, overlapRatio, isSlender, layerSimilarity } = analysis;

  // 优先级1: 层数<=2，无需连接
  if (layerCount <= 2) {
    return {
      recommended: 'none',
      confidence: 0.95,
      reason: `仅${layerCount}层，无需连接结构`,
      analysis,
    };
  }

  // 优先级2: 重叠率>30% + 细长 → tanghulu
  if (overlapRatio > 0.3 && isSlender) {
    return {
      recommended: 'tanghulu',
      confidence: 0.9,
      reason: `细长模型且重叠率${(overlapRatio * 100).toFixed(0)}%，糖葫芦串一串到底最稳固`,
      analysis,
    };
  }

  // 优先级3: 重叠率>25% + 层数>=8 → tanghulu
  if (overlapRatio > 0.25 && layerCount >= 8) {
    return {
      recommended: 'tanghulu',
      confidence: 0.85,
      reason: `${layerCount}层且重叠率${(overlapRatio * 100).toFixed(0)}%，层多重叠充分适合糖葫芦串`,
      analysis,
    };
  }

  // 优先级4: 面积>100 + 相似度>0.7 → centipede
  if (avgLayerArea > 100 && layerSimilarity > 0.7) {
    return {
      recommended: 'centipede',
      confidence: 0.85,
      reason: `大面积(均${Math.round(avgLayerArea)}px²)且相邻层相似度${(layerSimilarity * 100).toFixed(0)}%，蜈蚣骨架更稳`,
      analysis,
    };
  }

  // 优先级5: 重叠率<10% → centipede
  if (overlapRatio < 0.1) {
    return {
      recommended: 'centipede',
      confidence: 0.8,
      reason: `公共重叠率仅${(overlapRatio * 100).toFixed(0)}%，不足以串联，推荐蜈蚣骨架`,
      analysis,
    };
  }

  // 优先级6: 面积<=50 → tanghulu
  if (avgLayerArea <= 50) {
    return {
      recommended: 'tanghulu',
      confidence: 0.8,
      reason: `小模型(均${Math.round(avgLayerArea)}px²)，糖葫芦串更简洁`,
      analysis,
    };
  }

  // 默认: centipede
  return {
    recommended: 'centipede',
    confidence: 0.6,
    reason: '通用方案，蜈蚣骨架适用性广',
    analysis,
  };
}

// ===================== 主流程 =====================

/**
 * 主流程：生成等高线镂空切片 + 连接结构
 *
 * Phase 1：生成所有层（镂空）
 * Phase 1.5：模型分析 + 智能推荐
 * Phase 2a：蜈蚣连接器 (centipede/hybrid)
 * Phase 2b：糖葫芦串 (tanghulu/hybrid)
 * Phase 3：重新计算珠子数
 */
export function generateContourSlices(
  grid: VoxelGrid,
  config: ContourSliceConfig
): ContourSliceResult {
  const { shellThickness, connectionType } = config;

  // ===== Phase 1: 生成所有层 =====
  const validLayers: { y: number; fullLayer: (string | null)[][] }[] = [];

  for (let y = 0; y < grid.sizeY; y++) {
    const rawLayer = extractHorizontalLayer(grid, y);

    let hasContent = false;
    for (const row of rawLayer) {
      for (const cell of row) {
        if (cell !== null) { hasContent = true; break; }
      }
      if (hasContent) break;
    }
    if (!hasContent) continue;

    // 2D洪水填充：把被表面体素包围的内部空洞填实
    // 解决Y轴射线体素化导致的薄壳问题
    const fullLayer = floodFillLayer(rawLayer);

    validLayers.push({ y, fullLayer });
  }

  if (validLayers.length === 0) return { slices: [], connectors: [], skewers: [] };

  const minSpanForHollow = shellThickness * 2 + 1;
  const slices: ContourSlice[] = [];

  for (let i = 0; i < validLayers.length; i++) {
    const { y, fullLayer } = validLayers[i];
    const isFirstLayer = (i === 0);
    const isLastLayer = (i === validLayers.length - 1);

    const layerMinSpan = getLayerSpan(fullLayer);
    const tooSmallToHollow = layerMinSpan < minSpanForHollow;
    const keepSolid = isFirstLayer || isLastLayer || tooSmallToHollow;

    let finalLayer: (string | null)[][];

    if (keepSolid) {
      finalLayer = fullLayer.map(row => [...row]);
    } else {
      finalLayer = extractContour(fullLayer, shellThickness);
    }

    // 初始珠子数（Phase 3 会重算）
    let beadCount = 0;
    for (const row of finalLayer) {
      for (const cell of row) {
        if (cell !== null) beadCount++;
      }
    }

    slices.push({
      id: `Layer-${i + 1}`,
      layerIndex: y,
      width: grid.sizeX,
      height: grid.sizeZ,
      pixels: finalLayer,
      holes: [],
      skewerSlots: [],
      beadCount,
      isSolid: keepSolid,
    });
  }

  // ===== Phase 1.5: 模型分析 + 智能推荐 =====
  const fullLayersData = validLayers.map(v => v.fullLayer);
  const modelAnalysis = analyzeModel(slices, fullLayersData);
  const recommendation = recommendConnection(modelAnalysis);

  // 确定实际使用的连接方式
  let actualType: ConnectionType = connectionType;
  if (actualType === 'auto') {
    actualType = recommendation.recommended;
  }

  const useCentipede = actualType === 'centipede' || actualType === 'hybrid';
  const useTanghulu = actualType === 'tanghulu' || actualType === 'hybrid';

  // ===== Phase 2b: 糖葫芦串（先处理，蜈蚣需避开） =====
  const skewers: TanghuluSkewer[] = [];
  const skewerOccupied = new Set<string>(); // "row,col" 糖葫芦串占用的位置

  if (useTanghulu && slices.length >= 3) {
    // 使用镂空后的层数据计算覆盖率，确保插孔只在有珠子的位置
    const contourLayersData = slices.map(s => s.pixels);
    const coverage = findCoverageMap(contourLayersData);
    const slotWidth = 3;

    // 根据模型面积决定插条数量
    const skewerCount = modelAnalysis.avgLayerArea <= 50 ? 1
      : modelAnalysis.avgLayerArea <= 150 ? 2
      : 3;

    const positions = selectSkewerPositions(coverage, slices.length, skewerCount, slotWidth);

    // 预计算每层的外部距离图（区分外部边界 vs 镂空内部）
    const exteriorDistMaps = slices.map(s => computeExteriorDistanceMap(s.pixels));

    for (let si = 0; si < positions.length; si++) {
      const pos = positions[si];
      const skewerId = `Skewer-${si + 1}`;

      // 在每层上挖槽（使用外部距离图做安全检查）
      for (let li = 0; li < slices.length; li++) {
        punchSkewerSlot(slices[li].pixels, pos, slotWidth, skewerId, slices[li], exteriorDistMaps[li]);
      }

      // 记录占用位置（蜈蚣需避开）
      const halfSlot = Math.floor(slotWidth / 2);
      const avoidRange = halfSlot + 2; // 避开 ±2 格
      for (let dr = -avoidRange; dr <= avoidRange; dr++) {
        for (let dc = -avoidRange; dc <= avoidRange; dc++) {
          skewerOccupied.add(`${pos.row + dr},${pos.col + dc}`);
        }
      }

      // 生成插条像素
      const skewer = generateSkewerPiece(pos, slices.length, slotWidth, skewerId);
      skewers.push(skewer);
    }
  }

  // ===== Phase 2a: 蜈蚣连接器 =====
  const connectors: CentipedeConnector[] = [];

  if (useCentipede && slices.length >= 2) {
    // 全局孔洞占用集（用于每一层）
    // key = "layerIdx:row,col"
    const globalHoleSet = new Set<string>();

    for (let i = 0; i < slices.length - 1; i++) {
      const lowerSlice = slices[i];
      const upperSlice = slices[i + 1];

      // 交替方向：偶数索引=horizontal，奇数索引=vertical
      const orientation: 'horizontal' | 'vertical' = (i % 2 === 0) ? 'horizontal' : 'vertical';

      // 计算两层公共中心
      const center = computeCommonCenter(lowerSlice.pixels, upperSlice.pixels);
      if (!center) continue;

      // 选择扫描线
      const preferredLine = orientation === 'horizontal' ? center.centerRow : center.centerCol;
      const maxSearch = Math.max(lowerSlice.height, lowerSlice.width);
      const scanLine = findBestScanLine(
        lowerSlice.pixels, upperSlice.pixels,
        preferredLine, orientation,
        Math.floor(maxSearch / 3)
      );

      // 找交叉区段
      const crossLower = findShellCrossings(lowerSlice.pixels, scanLine, orientation);
      const crossUpper = findShellCrossings(upperSlice.pixels, scanLine, orientation);
      const intersected = intersectCrossings(crossLower, crossUpper);

      if (intersected.length === 0) continue;

      // 收集当前两层已有的孔洞（避冲突）
      const layerHoles = new Set<string>();
      for (const key of globalHoleSet) {
        if (key.startsWith(`${i}:`) || key.startsWith(`${i + 1}:`)) {
          const pos = key.split(':')[1];
          layerHoles.add(pos);
        }
      }

      // 混合模式：蜈蚣腿位置避开糖葫芦串占用区域
      for (const key of skewerOccupied) {
        layerHoles.add(key);
      }

      // 选择腿位置
      const legPositions = selectLegPositions(intersected, layerHoles, scanLine, orientation);

      if (legPositions.length === 0) continue;

      // 在两层上打孔
      const lowerHoles: HolePosition[] = legPositions.map(p => ({
        row: p.row,
        col: p.col,
        fromConnector: `Conn-${i + 1}-${i + 2}`,
        legDirection: 'up' as const,
      }));

      const upperHoles: HolePosition[] = legPositions.map(p => ({
        row: p.row,
        col: p.col,
        fromConnector: `Conn-${i + 1}-${i + 2}`,
        legDirection: 'down' as const,
      }));

      // 打孔
      punchHoles(lowerSlice.pixels, lowerHoles);
      punchHoles(upperSlice.pixels, upperHoles);

      // 记录孔洞到切片
      lowerSlice.holes.push(...lowerHoles);
      upperSlice.holes.push(...upperHoles);

      // 记录到全局集合
      for (const p of legPositions) {
        globalHoleSet.add(`${i}:${p.row},${p.col}`);
        globalHoleSet.add(`${i + 1}:${p.row},${p.col}`);
      }

      // 生成蜈蚣连接片
      const piece = generateCentipedePiece(legPositions, orientation, scanLine);

      // 计算连接片珠子数
      let connBeadCount = 0;
      for (const row of piece.pixels) {
        for (const cell of row) {
          if (cell !== null) connBeadCount++;
        }
      }

      connectors.push({
        id: `Conn-${i + 1}-${i + 2}`,
        betweenLayers: [i, i + 1],
        orientation,
        centerLine: scanLine,
        width: piece.width,
        height: 3,
        pixels: piece.pixels,
        upperLegPositions: legPositions,
        lowerLegPositions: legPositions, // 上下腿位置相同
        beadCount: connBeadCount,
      });
    }
  }

  // ===== Phase 3: 重新计算珠子数 =====
  for (const slice of slices) {
    let beadCount = 0;
    for (const row of slice.pixels) {
      for (const cell of row) {
        if (cell !== null) beadCount++;
      }
    }
    slice.beadCount = beadCount;
  }

  return { slices, connectors, skewers, recommendation };
}

// ===================== 渲染函数 =====================

/**
 * 渲染单层等高线切片为 Canvas
 * 孔洞标记：橙色圆圈+十字
 */
export function renderContourSliceToCanvas(
  slice: ContourSlice,
  cellSize: number = 12,
  showGrid: boolean = true,
  showHoleMarkers: boolean = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = slice.width * cellSize;
  canvas.height = slice.height * cellSize;

  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制像素（带深色边框，确保浅色珠子也清晰可见）
  for (let row = 0; row < slice.height; row++) {
    for (let col = 0; col < slice.width; col++) {
      const color = slice.pixels[row]?.[col];
      if (color) {
        const x = col * cellSize;
        const y = row * cellSize;
        // 填充珠子颜色
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize, cellSize);
        // 深色边框让浅色珠子也能看清
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }

  // 绘制孔洞标记（橙色圆圈+十字）
  if (showHoleMarkers && slice.holes.length > 0) {
    for (const hole of slice.holes) {
      const cx = hole.col * cellSize + cellSize / 2;
      const cy = hole.row * cellSize + cellSize / 2;
      const r = cellSize / 3;

      // 橙色圆圈
      ctx.strokeStyle = '#FF8C00';
      ctx.lineWidth = Math.max(1.5, cellSize / 8);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // 十字
      const crossSize = r * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - crossSize, cy);
      ctx.lineTo(cx + crossSize, cy);
      ctx.moveTo(cx, cy - crossSize);
      ctx.lineTo(cx, cy + crossSize);
      ctx.stroke();
    }
  }

  // 绘制糖葫芦串槽标记（紫色方框）
  if (showHoleMarkers && slice.skewerSlots.length > 0) {
    for (const slot of slice.skewerSlots) {
      const sx = slot.col * cellSize;
      const sy = slot.row * cellSize;

      // 紫色半透明填充
      ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.fillRect(sx, sy, cellSize, cellSize);

      // 紫色边框
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = Math.max(1.5, cellSize / 8);
      ctx.strokeRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);
    }
  }

  // 绘制网格
  if (showGrid) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= slice.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= slice.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }

    // 粗网格线（每5格）
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    for (let x = 0; x <= slice.width; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= slice.height; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }
  }

  // 绘制标签
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 80, 22);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(slice.id, 5, 15);

  // 珠子数
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(canvas.width - 60, 0, 60, 22);
  ctx.fillStyle = '#fff';
  ctx.font = '11px Arial';
  ctx.fillText(`${slice.beadCount}颗`, canvas.width - 55, 15);

  return canvas;
}

/**
 * 渲染蜈蚣连接片为 Canvas
 * 灰色脊柱 + 橙色腿
 */
export function renderCentipedeToCanvas(
  connector: CentipedeConnector,
  cellSize: number = 16,
  showGrid: boolean = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = connector.width * cellSize;
  canvas.height = 3 * cellSize;

  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制像素
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < connector.width; col++) {
      const color = connector.pixels[row]?.[col];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

        // 珠子边框
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }

  // 绘制网格
  if (showGrid) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= connector.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= 3; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }
  }

  // 标签
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  const labelWidth = Math.min(100, canvas.width);
  ctx.fillRect(0, 0, labelWidth, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Arial';
  ctx.fillText(connector.id, 3, 13);

  // 方向标记
  const dirLabel = connector.orientation === 'horizontal' ? 'H' : 'V';
  ctx.fillStyle = 'rgba(255,140,0,0.8)';
  ctx.fillRect(canvas.width - 20, 0, 20, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Arial';
  ctx.fillText(dirLabel, canvas.width - 15, 13);

  return canvas;
}

/**
 * 导出蜈蚣连接片为图片
 */
export function exportCentipedeAsImage(
  connector: CentipedeConnector,
  cellSize: number = 20
): string {
  const canvas = renderCentipedeToCanvas(connector, cellSize);
  return canvas.toDataURL('image/png');
}

/**
 * 导出切片为图片
 */
export function exportContourSliceAsImage(
  slice: ContourSlice,
  cellSize: number = 12
): string {
  const canvas = renderContourSliceToCanvas(slice, cellSize);
  return canvas.toDataURL('image/png');
}

/**
 * 计算等高线切片统计
 */
export function getContourSliceStats(slices: ContourSlice[]): {
  totalLayers: number;
  totalBeads: number;
  maxWidth: number;
  maxHeight: number;
  beadsPerLayer: { id: string; count: number }[];
} {
  let totalBeads = 0;
  let maxWidth = 0;
  let maxHeight = 0;
  const beadsPerLayer: { id: string; count: number }[] = [];

  for (const slice of slices) {
    totalBeads += slice.beadCount;
    maxWidth = Math.max(maxWidth, slice.width);
    maxHeight = Math.max(maxHeight, slice.height);
    beadsPerLayer.push({ id: slice.id, count: slice.beadCount });
  }

  return {
    totalLayers: slices.length,
    totalBeads,
    maxWidth,
    maxHeight,
    beadsPerLayer,
  };
}

/**
 * 渲染糖葫芦串插条为 Canvas
 * 紫色主题，矩形插条
 */
export function renderSkewerToCanvas(
  skewer: TanghuluSkewer,
  cellSize: number = 16,
  showGrid: boolean = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = skewer.width * cellSize;
  canvas.height = skewer.height * cellSize;

  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制像素
  for (let row = 0; row < skewer.height; row++) {
    for (let col = 0; col < skewer.width; col++) {
      const color = skewer.pixels[row]?.[col];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);

        // 珠子边框
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }

  // 绘制网格
  if (showGrid) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= skewer.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= skewer.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }
  }

  // 标签
  ctx.fillStyle = 'rgba(139, 92, 246, 0.85)';
  const labelWidth = Math.min(80, canvas.width);
  ctx.fillRect(0, 0, labelWidth, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Arial';
  ctx.fillText(skewer.id, 3, 13);

  // 层数标记
  const layerLabel = `${skewer.layerCount}层`;
  ctx.fillStyle = 'rgba(139, 92, 246, 0.85)';
  ctx.fillRect(canvas.width - 35, 0, 35, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 10px Arial';
  ctx.fillText(layerLabel, canvas.width - 32, 13);

  return canvas;
}

/**
 * 导出糖葫芦串插条为图片
 */
export function exportSkewerAsImage(
  skewer: TanghuluSkewer,
  cellSize: number = 20
): string {
  const canvas = renderSkewerToCanvas(skewer, cellSize);
  return canvas.toDataURL('image/png');
}
