/**
 * 切片服务
 * 将3D体素模型切片为逐层图纸
 */

import { VoxelModel, Layer, LayerBead, BeadStats3D } from '../../types/3d/voxel';
import { artkalColors } from '../../data/beadColors';

/**
 * 将体素模型切片为逐层数据
 * @param model 体素模型
 * @returns 逐层数据数组（从底层到顶层）
 */
export function sliceModel(model: VoxelModel): Layer[] {
  const layers: Layer[] = [];

  for (let z = 0; z < model.depth; z++) {
    const layerVoxels = model.voxels.filter(v => v.z === z);

    const beads: LayerBead[] = layerVoxels.map(v => {
      const beadInfo = artkalColors.find(b => b.id === v.beadId);
      return {
        x: v.x,
        y: v.y,
        color: v.color,
        beadId: v.beadId,
        beadName: beadInfo?.name || v.beadId,
      };
    });

    layers.push({
      z,
      width: model.width,
      height: model.height,
      beads,
    });
  }

  return layers;
}

/**
 * 计算3D模型的珠子统计
 * @param model 体素模型
 * @returns 珠子统计信息
 */
export function calculateBeadStats(model: VoxelModel): BeadStats3D {
  const colorMap = new Map<string, { beadId: string; beadName: string; color: string; count: number }>();

  for (const voxel of model.voxels) {
    const existing = colorMap.get(voxel.beadId);
    if (existing) {
      existing.count++;
    } else {
      const beadInfo = artkalColors.find(b => b.id === voxel.beadId);
      colorMap.set(voxel.beadId, {
        beadId: voxel.beadId,
        beadName: beadInfo?.name || voxel.beadId,
        color: voxel.color,
        count: 1,
      });
    }
  }

  // 按数量排序
  const colorStats = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);

  return {
    totalCount: model.voxels.length,
    layerCount: model.depth,
    colorStats,
  };
}

/**
 * 将单层渲染为Canvas图像
 * @param layer 层数据
 * @param cellSize 单元格大小（像素）
 * @param showGrid 是否显示网格
 * @returns Canvas元素
 */
export function renderLayerToCanvas(
  layer: Layer,
  cellSize: number = 20,
  showGrid: boolean = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = layer.width * cellSize;
  canvas.height = layer.height * cellSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建Canvas上下文');
  }

  // 填充背景
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制珠子
  for (const bead of layer.beads) {
    ctx.fillStyle = bead.color;
    ctx.fillRect(bead.x * cellSize, bead.y * cellSize, cellSize, cellSize);
  }

  // 绘制网格
  if (showGrid) {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;

    // 垂直线
    for (let x = 0; x <= layer.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }

    // 水平线
    for (let y = 0; y <= layer.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }

    // 加粗的主网格线（每5格）
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;

    for (let x = 0; x <= layer.width; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= layer.height; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }
  }

  return canvas;
}

/**
 * 导出单层为图片
 * @param layer 层数据
 * @param cellSize 单元格大小
 * @param format 图片格式
 * @returns 图片的 data URL
 */
export function exportLayerAsImage(
  layer: Layer,
  cellSize: number = 20,
  format: 'png' | 'jpeg' = 'png'
): string {
  const canvas = renderLayerToCanvas(layer, cellSize, true);
  return canvas.toDataURL(`image/${format}`);
}

/**
 * 导出所有层为图片数组
 * @param layers 所有层数据
 * @param cellSize 单元格大小
 * @returns 图片 data URL 数组
 */
export function exportAllLayersAsImages(
  layers: Layer[],
  cellSize: number = 20
): string[] {
  return layers.map(layer => exportLayerAsImage(layer, cellSize));
}

/**
 * 生成组装说明
 * @param layers 逐层数据
 * @param stats 统计信息
 * @returns 组装说明文本
 */
export function generateAssemblyInstructions(layers: Layer[], stats: BeadStats3D): string {
  const lines: string[] = [
    '# 3D拼豆组装说明',
    '',
    '## 材料清单',
    '',
    `- 总珠子数: ${stats.totalCount} 颗`,
    `- 层数: ${stats.layerCount} 层`,
    '',
    '### 颜色明细',
    '',
  ];

  for (const color of stats.colorStats) {
    lines.push(`- ${color.beadName} (${color.beadId}): ${color.count} 颗`);
  }

  lines.push('', '## 组装步骤', '');

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    lines.push(`### 第 ${i + 1} 层（从底部数）`);
    lines.push(`- 珠子数: ${layer.beads.length} 颗`);
    lines.push(`- 参考图纸: 第${i + 1}层图纸`);
    lines.push('');
  }

  lines.push('## 注意事项', '');
  lines.push('1. 从第1层（底层）开始，逐层向上搭建');
  lines.push('2. 每完成一层，使用熨斗轻轻熨烫固定');
  lines.push('3. 确保上下层对齐后再熨烫');
  lines.push('4. 最后整体熨烫加固');

  return lines.join('\n');
}
