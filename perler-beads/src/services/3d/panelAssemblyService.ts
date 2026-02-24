/**
 * 面板拼接服务
 * 将3D体素模型拆解为6个面板（top/bottom/front/back/left/right），
 * 通过互锁凹凸卡槽实现垂直拼接。
 *
 * 核心流程：
 * 1. 从VoxelGrid的6个方向投影提取面板颜色
 * 2. 为12条共享边生成互补的凹凸卡槽
 * 3. 修改面板像素以体现凹凸
 * 4. Canvas渲染用于图纸导出
 */

import { VoxelGrid } from './modelVoxelizeService';
import {
  PanelFace,
  EdgePosition,
  SlotType,
  SlotUnit,
  FacePanel,
  EdgeConnection,
  PanelAssemblyResult,
  PanelAssemblyConfig,
  DEFAULT_PANEL_CONFIG,
} from '../../types/3d/panel';

// ===================== 面板提取算法 =====================

/**
 * 从VoxelGrid中提取单个面板的投影颜色
 *
 * 投影规则：沿特定轴方向扫描，取第一个非null颜色作为面板颜色
 *
 * | 面     | 扫描轴 | 方向     | 面板宽=? | 面板高=? |
 * |--------|--------|----------|----------|----------|
 * | front  | Z      | max→min  | sizeX    | sizeY    |
 * | back   | Z      | min→max  | sizeX    | sizeY (col镜像) |
 * | right  | X      | max→min  | sizeZ    | sizeY    |
 * | left   | X      | min→max  | sizeZ    | sizeY (col镜像) |
 * | top    | Y      | max→min  | sizeX    | sizeZ    |
 * | bottom | Y      | min→max  | sizeX    | sizeZ (row镜像) |
 */
function extractFacePanel(
  grid: VoxelGrid,
  face: PanelFace
): { pixels: (string | null)[][]; width: number; height: number } {
  const { sizeX, sizeY, sizeZ, data } = grid;

  let width: number;
  let height: number;
  let pixels: (string | null)[][];

  switch (face) {
    case 'front': {
      // Z: max→min, width=sizeX, height=sizeY
      width = sizeX;
      height = sizeY;
      pixels = [];
      for (let row = 0; row < height; row++) {
        const y = height - 1 - row; // 顶部在上
        const rowData: (string | null)[] = [];
        for (let col = 0; col < width; col++) {
          const x = col;
          let color: string | null = null;
          for (let z = sizeZ - 1; z >= 0; z--) {
            if (data[x]?.[y]?.[z]) {
              color = data[x][y][z];
              break;
            }
          }
          rowData.push(color);
        }
        pixels.push(rowData);
      }
      break;
    }
    case 'back': {
      // Z: min→max, width=sizeX, height=sizeY, col镜像
      width = sizeX;
      height = sizeY;
      pixels = [];
      for (let row = 0; row < height; row++) {
        const y = height - 1 - row;
        const rowData: (string | null)[] = [];
        for (let col = 0; col < width; col++) {
          const x = width - 1 - col; // 镜像：确保组装时图案朝外
          let color: string | null = null;
          for (let z = 0; z < sizeZ; z++) {
            if (data[x]?.[y]?.[z]) {
              color = data[x][y][z];
              break;
            }
          }
          rowData.push(color);
        }
        pixels.push(rowData);
      }
      break;
    }
    case 'right': {
      // X: max→min, width=sizeZ, height=sizeY
      width = sizeZ;
      height = sizeY;
      pixels = [];
      for (let row = 0; row < height; row++) {
        const y = height - 1 - row;
        const rowData: (string | null)[] = [];
        for (let col = 0; col < width; col++) {
          const z = col;
          let color: string | null = null;
          for (let x = sizeX - 1; x >= 0; x--) {
            if (data[x]?.[y]?.[z]) {
              color = data[x][y][z];
              break;
            }
          }
          rowData.push(color);
        }
        pixels.push(rowData);
      }
      break;
    }
    case 'left': {
      // X: min→max, width=sizeZ, height=sizeY, col镜像
      width = sizeZ;
      height = sizeY;
      pixels = [];
      for (let row = 0; row < height; row++) {
        const y = height - 1 - row;
        const rowData: (string | null)[] = [];
        for (let col = 0; col < width; col++) {
          const z = width - 1 - col; // 镜像
          let color: string | null = null;
          for (let x = 0; x < sizeX; x++) {
            if (data[x]?.[y]?.[z]) {
              color = data[x][y][z];
              break;
            }
          }
          rowData.push(color);
        }
        pixels.push(rowData);
      }
      break;
    }
    case 'top': {
      // Y: max→min, width=sizeX, height=sizeZ
      width = sizeX;
      height = sizeZ;
      pixels = [];
      for (let row = 0; row < height; row++) {
        const z = row;
        const rowData: (string | null)[] = [];
        for (let col = 0; col < width; col++) {
          const x = col;
          let color: string | null = null;
          for (let y = sizeY - 1; y >= 0; y--) {
            if (data[x]?.[y]?.[z]) {
              color = data[x][y][z];
              break;
            }
          }
          rowData.push(color);
        }
        pixels.push(rowData);
      }
      break;
    }
    case 'bottom': {
      // Y: min→max, width=sizeX, height=sizeZ, row镜像
      width = sizeX;
      height = sizeZ;
      pixels = [];
      for (let row = 0; row < height; row++) {
        const z = height - 1 - row; // 镜像
        const rowData: (string | null)[] = [];
        for (let col = 0; col < width; col++) {
          const x = col;
          let color: string | null = null;
          for (let y = 0; y < sizeY; y++) {
            if (data[x]?.[y]?.[z]) {
              color = data[x][y][z];
              break;
            }
          }
          rowData.push(color);
        }
        pixels.push(rowData);
      }
      break;
    }
  }

  return { pixels, width, height };
}

// ===================== 凹凸分组算法 =====================

/**
 * 生成一条边的凹凸卡槽序列
 * @param edgeLength 边长（珠子数）
 * @param groupSize 分组大小（珠子数）
 * @param depth 槽深度（珠子数）
 * @param startWithConcave 首组为凹（true）或凸（false）
 * @returns 卡槽单元数组
 */
function generateSlotPattern(
  edgeLength: number,
  groupSize: number,
  depth: number,
  startWithConcave: boolean
): SlotUnit[] {
  if (edgeLength <= 0) return [];

  const slots: SlotUnit[] = [];
  let pos = 0;
  let isConcave = startWithConcave;

  while (pos < edgeLength) {
    let len = groupSize;
    // 余数并入最后一组
    if (pos + len >= edgeLength) {
      len = edgeLength - pos;
    } else if (pos + len + groupSize > edgeLength) {
      // 下一组不足一整组，当前组吃掉余数
      len = edgeLength - pos;
    }

    slots.push({
      startPos: pos,
      length: len,
      type: isConcave ? 'concave' : 'convex',
      depth,
    });

    pos += len;
    isConcave = !isConcave;
  }

  return slots;
}

/**
 * 生成互补的卡槽对
 * Panel A 和 Panel B 的卡槽在同一条边上互补
 */
function generateComplementarySlots(
  edgeLength: number,
  groupSize: number,
  depth: number
): { slotsA: SlotUnit[]; slotsB: SlotUnit[] } {
  const slotsA = generateSlotPattern(edgeLength, groupSize, depth, true);
  const slotsB = generateSlotPattern(edgeLength, groupSize, depth, false);
  return { slotsA, slotsB };
}

// ===================== 12条边连接映射 =====================

/**
 * 12条边的连接映射（固定拓扑）
 * 每条边连接两个面板的特定边缘
 */
interface EdgeDef {
  panelA: PanelFace;
  panelAEdge: EdgePosition;
  panelB: PanelFace;
  panelBEdge: EdgePosition;
  getEdgeLength: (sizeX: number, sizeY: number, sizeZ: number) => number;
}

const EDGE_DEFINITIONS: EdgeDef[] = [
  // 顶面4条边
  { panelA: 'top', panelAEdge: 'bottom', panelB: 'front', panelBEdge: 'top', getEdgeLength: (sx) => sx },
  { panelA: 'top', panelAEdge: 'top', panelB: 'back', panelBEdge: 'top', getEdgeLength: (sx) => sx },
  { panelA: 'top', panelAEdge: 'left', panelB: 'left', panelBEdge: 'top', getEdgeLength: (_sx, _sy, sz) => sz },
  { panelA: 'top', panelAEdge: 'right', panelB: 'right', panelBEdge: 'top', getEdgeLength: (_sx, _sy, sz) => sz },
  // 底面4条边
  { panelA: 'bottom', panelAEdge: 'top', panelB: 'front', panelBEdge: 'bottom', getEdgeLength: (sx) => sx },
  { panelA: 'bottom', panelAEdge: 'bottom', panelB: 'back', panelBEdge: 'bottom', getEdgeLength: (sx) => sx },
  { panelA: 'bottom', panelAEdge: 'left', panelB: 'left', panelBEdge: 'bottom', getEdgeLength: (_sx, _sy, sz) => sz },
  { panelA: 'bottom', panelAEdge: 'right', panelB: 'right', panelBEdge: 'bottom', getEdgeLength: (_sx, _sy, sz) => sz },
  // 中间4条边
  { panelA: 'front', panelAEdge: 'left', panelB: 'left', panelBEdge: 'right', getEdgeLength: (_sx, sy) => sy },
  { panelA: 'front', panelAEdge: 'right', panelB: 'right', panelBEdge: 'left', getEdgeLength: (_sx, sy) => sy },
  { panelA: 'back', panelAEdge: 'right', panelB: 'left', panelBEdge: 'left', getEdgeLength: (_sx, sy) => sy },
  { panelA: 'back', panelAEdge: 'left', panelB: 'right', panelBEdge: 'right', getEdgeLength: (_sx, sy) => sy },
];

// ===================== 应用凹槽到像素 =====================

/**
 * 将凹槽应用到面板像素
 * 凹位置：沿边缘向内 depth 行/列设为 null
 * 凸位置：保持不变
 */
function applySlotsToPixels(
  pixels: (string | null)[][],
  edge: EdgePosition,
  slots: SlotUnit[]
): void {
  const rows = pixels.length;
  if (rows === 0) return;
  const cols = pixels[0].length;

  for (const slot of slots) {
    if (slot.type !== 'concave') continue;

    for (let i = 0; i < slot.length; i++) {
      const pos = slot.startPos + i;

      for (let d = 0; d < slot.depth; d++) {
        let r: number, c: number;

        switch (edge) {
          case 'top':
            r = d;
            c = pos;
            break;
          case 'bottom':
            r = rows - 1 - d;
            c = pos;
            break;
          case 'left':
            r = pos;
            c = d;
            break;
          case 'right':
            r = pos;
            c = cols - 1 - d;
            break;
        }

        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          pixels[r][c] = null;
        }
      }
    }
  }
}

// ===================== 面板名称 =====================

const FACE_LABELS: Record<PanelFace, string> = {
  top: '顶面',
  bottom: '底面',
  front: '前面',
  back: '后面',
  left: '左面',
  right: '右面',
};

/** 获取面板中文名称 */
export function getFaceLabel(face: PanelFace): string {
  return FACE_LABELS[face];
}

// ===================== 主入口 =====================

/**
 * 生成面板拼接结果
 * 主流程：提取6面板 → 生成凹凸卡槽 → 应用到像素 → 计算统计
 */
export function generatePanelAssembly(
  grid: VoxelGrid,
  config: Partial<PanelAssemblyConfig> = {}
): PanelAssemblyResult {
  const cfg: PanelAssemblyConfig = { ...DEFAULT_PANEL_CONFIG, ...config };
  const { slotGroupSize, slotDepth, enabledFaces } = cfg;

  // 1. 提取所有启用面的面板
  const panelMap = new Map<PanelFace, FacePanel>();

  for (const face of enabledFaces) {
    const { pixels, width, height } = extractFacePanel(grid, face);

    // 检查面板是否有内容
    let hasContent = false;
    for (const row of pixels) {
      for (const cell of row) {
        if (cell !== null) { hasContent = true; break; }
      }
      if (hasContent) break;
    }

    if (!hasContent) continue;

    const panel: FacePanel = {
      id: `Panel-${face.charAt(0).toUpperCase() + face.slice(1)}`,
      face,
      baseWidth: width,
      baseHeight: height,
      width,
      height,
      pixels: pixels.map(row => [...row]),
      edgeSlots: { top: [], bottom: [], left: [], right: [] },
      beadCount: 0,
    };

    panelMap.set(face, panel);
  }

  // 2. 生成12条边的连接关系和凹凸卡槽
  const edges: EdgeConnection[] = [];

  for (const edgeDef of EDGE_DEFINITIONS) {
    const panelA = panelMap.get(edgeDef.panelA);
    const panelB = panelMap.get(edgeDef.panelB);

    if (!panelA || !panelB) continue;

    const edgeLength = edgeDef.getEdgeLength(grid.sizeX, grid.sizeY, grid.sizeZ);

    // 生成互补卡槽
    const { slotsA, slotsB } = generateComplementarySlots(edgeLength, slotGroupSize, slotDepth);

    // 记录到面板
    panelA.edgeSlots[edgeDef.panelAEdge] = slotsA;
    panelB.edgeSlots[edgeDef.panelBEdge] = slotsB;

    // 应用凹槽到像素
    applySlotsToPixels(panelA.pixels, edgeDef.panelAEdge, slotsA);
    applySlotsToPixels(panelB.pixels, edgeDef.panelBEdge, slotsB);

    edges.push({
      panelA: edgeDef.panelA,
      panelAEdge: edgeDef.panelAEdge,
      panelB: edgeDef.panelB,
      panelBEdge: edgeDef.panelBEdge,
      edgeLength,
    });
  }

  // 3. 计算珠子数
  const panels: FacePanel[] = [];
  for (const panel of panelMap.values()) {
    let beadCount = 0;
    for (const row of panel.pixels) {
      for (const cell of row) {
        if (cell !== null) beadCount++;
      }
    }
    panel.beadCount = beadCount;
    panels.push(panel);
  }

  // 按固定顺序排列
  const faceOrder: PanelFace[] = ['front', 'back', 'left', 'right', 'top', 'bottom'];
  panels.sort((a, b) => faceOrder.indexOf(a.face) - faceOrder.indexOf(b.face));

  // 4. 组装顺序建议
  const assemblyOrder: PanelFace[] = ['bottom', 'back', 'left', 'right', 'front', 'top'];

  // 5. 统计
  let totalBeads = 0;
  const panelBreakdown: { face: PanelFace; beadCount: number }[] = [];
  for (const panel of panels) {
    totalBeads += panel.beadCount;
    panelBreakdown.push({ face: panel.face, beadCount: panel.beadCount });
  }

  return {
    panels,
    edges,
    assemblyOrder: assemblyOrder.filter(f => panelMap.has(f)),
    stats: {
      totalPanels: panels.length,
      totalBeads,
      panelBreakdown,
    },
  };
}

// ===================== 渲染函数 =====================

/**
 * 渲染单个面板为 Canvas
 * @param panel 面板数据
 * @param cellSize 单珠子像素大小
 * @param showGrid 是否显示网格
 * @param showSlotMarkers 是否显示凹凸标记
 */
export function renderFacePanelToCanvas(
  panel: FacePanel,
  cellSize: number = 12,
  showGrid: boolean = true,
  showSlotMarkers: boolean = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = panel.width * cellSize;
  canvas.height = panel.height * cellSize;

  const ctx = canvas.getContext('2d')!;

  // 背景
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制像素（带深色边框）
  for (let row = 0; row < panel.height; row++) {
    for (let col = 0; col < panel.width; col++) {
      const color = panel.pixels[row]?.[col];
      if (color) {
        const x = col * cellSize;
        const y = row * cellSize;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }

  // 绘制凹凸标记
  if (showSlotMarkers) {
    const edges: EdgePosition[] = ['top', 'bottom', 'left', 'right'];
    for (const edge of edges) {
      const slots = panel.edgeSlots[edge];
      for (const slot of slots) {
        for (let i = 0; i < slot.length; i++) {
          const pos = slot.startPos + i;
          for (let d = 0; d < slot.depth; d++) {
            let r: number, c: number;
            switch (edge) {
              case 'top': r = d; c = pos; break;
              case 'bottom': r = panel.height - 1 - d; c = pos; break;
              case 'left': r = pos; c = d; break;
              case 'right': r = pos; c = panel.width - 1 - d; break;
            }

            if (r >= 0 && r < panel.height && c >= 0 && c < panel.width) {
              const sx = c * cellSize;
              const sy = r * cellSize;

              if (slot.type === 'concave') {
                // 凹槽标记：蓝色半透明
                ctx.fillStyle = 'rgba(59,130,246,0.3)';
                ctx.fillRect(sx, sy, cellSize, cellSize);
                ctx.strokeStyle = 'rgba(59,130,246,0.6)';
                ctx.lineWidth = 1;
                ctx.strokeRect(sx + 0.5, sy + 0.5, cellSize - 1, cellSize - 1);
              } else {
                // 凸起标记：琥珀色半透明（仅有颜色时标记）
                if (panel.pixels[r]?.[c]) {
                  ctx.fillStyle = 'rgba(245,158,11,0.3)';
                  ctx.fillRect(sx, sy, cellSize, cellSize);
                  ctx.strokeStyle = 'rgba(245,158,11,0.6)';
                  ctx.lineWidth = 1;
                  ctx.strokeRect(sx + 0.5, sy + 0.5, cellSize - 1, cellSize - 1);
                }
              }
            }
          }
        }
      }
    }
  }

  // 绘制网格
  if (showGrid) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= panel.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= panel.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }

    // 粗网格线（每5格）
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1;
    for (let x = 0; x <= panel.width; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= panel.height; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }
  }

  // 面板标签（左上角）
  const faceLabel = getFaceLabel(panel.face);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, 90, 22);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`${panel.id}`, 5, 15);

  // 中文面名（右上角）
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const labelWidth = ctx.measureText(faceLabel).width + 16;
  ctx.fillRect(canvas.width - labelWidth, 0, labelWidth, 22);
  ctx.fillStyle = '#fff';
  ctx.font = '11px Arial';
  ctx.fillText(faceLabel, canvas.width - labelWidth + 8, 15);

  // 珠子数（左下角）
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, canvas.height - 22, 80, 22);
  ctx.fillStyle = '#fff';
  ctx.font = '11px Arial';
  ctx.fillText(`${panel.beadCount}颗`, 5, canvas.height - 7);

  // 凹凸图例（右下角，仅showSlotMarkers时）
  if (showSlotMarkers) {
    const legendW = 100;
    const legendH = 28;
    const lx = canvas.width - legendW - 4;
    const ly = canvas.height - legendH - 4;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(lx, ly, legendW, legendH);

    // 凹标记
    ctx.fillStyle = 'rgba(59,130,246,0.5)';
    ctx.fillRect(lx + 6, ly + 7, 12, 12);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText('凹', lx + 22, ly + 17);

    // 凸标记
    ctx.fillStyle = 'rgba(245,158,11,0.5)';
    ctx.fillRect(lx + 50, ly + 7, 12, 12);
    ctx.fillStyle = '#fff';
    ctx.fillText('凸', lx + 66, ly + 17);
  }

  return canvas;
}

/**
 * 导出面板图纸为图片数据URL
 */
export function exportFacePanelAsImage(
  panel: FacePanel,
  cellSize: number = 20
): string {
  const canvas = renderFacePanelToCanvas(panel, cellSize, true, true);
  return canvas.toDataURL('image/png');
}

/**
 * 建议组装顺序（中文描述）
 */
export function getAssemblyGuide(assemblyOrder: PanelFace[]): string[] {
  return assemblyOrder.map((face, idx) => {
    const label = getFaceLabel(face);
    const step = idx + 1;
    switch (face) {
      case 'bottom': return `${step}. 放置${label}作为底座`;
      case 'back': return `${step}. 将${label}竖直卡入底座后边缘`;
      case 'left': return `${step}. 将${label}卡入底座和后面的左侧`;
      case 'right': return `${step}. 将${label}卡入底座和后面的右侧`;
      case 'front': return `${step}. 将${label}卡入底座、左面和右面的前边缘`;
      case 'top': return `${step}. 最后盖上${label}，卡入四周面板的顶部`;
      default: return `${step}. 安装${label}`;
    }
  });
}
