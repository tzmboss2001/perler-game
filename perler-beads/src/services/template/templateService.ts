/**
 * 模板服务
 * 负责加载、展开、实例化模板
 */

import {
  Template,
  TemplateShape,
  TemplateVoxel,
  ExpandedTemplate,
  UserParams,
  UserColors,
  SphereShape,
  EllipsoidShape,
  BoxShape,
  CylinderShape,
} from '../../types/template';

// 模板缓存
const templateCache = new Map<string, Template>();

/**
 * 加载模板
 */
export async function loadTemplate(templateId: string): Promise<Template> {
  // 检查缓存
  if (templateCache.has(templateId)) {
    return templateCache.get(templateId)!;
  }

  // 动态导入模板JSON
  try {
    const module = await import(`../../data/templates/${templateId}.json`);
    const template = module.default as Template;
    templateCache.set(templateId, template);
    return template;
  } catch (error) {
    console.error(`加载模板失败: ${templateId}`, error);
    throw new Error(`模板不存在: ${templateId}`);
  }
}

/**
 * 获取所有可用模板列表
 */
export function getAvailableTemplates(): { id: string; name: string; category: string }[] {
  // 暂时硬编码，后续可以改成动态扫描
  return [
    { id: 'animal_bear_001', name: '泰迪熊-站立', category: 'animal' },
    // 后续添加更多模板
  ];
}

/**
 * 将形状展开为体素列表
 */
export function expandShapesToVoxels(
  shapes: TemplateShape[],
  params?: UserParams
): TemplateVoxel[] {
  const voxelMap = new Map<string, TemplateVoxel>();

  for (const shape of shapes) {
    const shapeVoxels = expandSingleShape(shape, params);

    // 合并到map（后面的形状覆盖前面的）
    for (const voxel of shapeVoxels) {
      const key = `${voxel.x},${voxel.y},${voxel.z}`;
      voxelMap.set(key, voxel);
    }
  }

  return Array.from(voxelMap.values());
}

/**
 * 展开单个形状
 */
function expandSingleShape(shape: TemplateShape, params?: UserParams): TemplateVoxel[] {
  switch (shape.type) {
    case 'sphere':
      return expandSphere(shape, params);
    case 'ellipsoid':
      return expandEllipsoid(shape, params);
    case 'box':
      return expandBox(shape, params);
    case 'cylinder':
      return expandCylinder(shape, params);
    default:
      console.warn(`未知形状类型: ${(shape as TemplateShape).type}`);
      return [];
  }
}

/**
 * 展开球体
 */
function expandSphere(shape: SphereShape, params?: UserParams): TemplateVoxel[] {
  const [cx, cy, cz] = shape.center;
  const r = shape.radius;
  const voxels: TemplateVoxel[] = [];

  // 应用缩放参数
  let scale = 1.0;
  if (params && shape.slot === 'head' && params.head_scale) {
    scale = params.head_scale;
  } else if (params && shape.slot === 'ear' && params.ear_scale) {
    scale = params.ear_scale;
  }

  const scaledR = r * scale;

  // 遍历边界框内的所有点
  for (let x = Math.floor(cx - scaledR); x <= Math.ceil(cx + scaledR); x++) {
    for (let y = Math.floor(cy - scaledR); y <= Math.ceil(cy + scaledR); y++) {
      for (let z = Math.floor(cz - scaledR); z <= Math.ceil(cz + scaledR); z++) {
        // 检查是否在球内
        const dx = x - cx;
        const dy = y - cy;
        const dz = z - cz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist <= scaledR && x >= 0 && y >= 0 && z >= 0) {
          voxels.push({
            x: Math.round(x),
            y: Math.round(y),
            z: Math.round(z),
            slot: shape.slot,
          });
        }
      }
    }
  }

  return voxels;
}

/**
 * 展开椭球体
 */
function expandEllipsoid(shape: EllipsoidShape, params?: UserParams): TemplateVoxel[] {
  const [cx, cy, cz] = shape.center;
  let [rx, ry, rz] = shape.radii;
  const voxels: TemplateVoxel[] = [];

  // 应用缩放参数
  if (params) {
    if (shape.slot === 'head' && params.head_scale) {
      rx *= params.head_scale;
      ry *= params.head_scale;
      rz *= params.head_scale;
    } else if (shape.slot === 'belly' && params.belly_scale) {
      rx *= params.belly_scale;
      ry *= params.belly_scale;
      rz *= params.belly_scale;
    } else if ((shape.slot === 'arm' || shape.slot === 'leg') && params.limb_length) {
      ry += params.limb_length * 0.5;  // 调整Y方向（长度）
    }
  }

  // 遍历边界框内的所有点
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
        // 检查是否在椭球内: (x-cx)²/rx² + (y-cy)²/ry² + (z-cz)²/rz² <= 1
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const dz = (z - cz) / rz;
        const dist = dx * dx + dy * dy + dz * dz;

        if (dist <= 1 && x >= 0 && y >= 0 && z >= 0) {
          voxels.push({
            x: Math.round(x),
            y: Math.round(y),
            z: Math.round(z),
            slot: shape.slot,
          });
        }
      }
    }
  }

  return voxels;
}

/**
 * 展开长方体
 */
function expandBox(shape: BoxShape, _params?: UserParams): TemplateVoxel[] {
  const [minX, minY, minZ] = shape.min;
  const [maxX, maxY, maxZ] = shape.max;
  const voxels: TemplateVoxel[] = [];

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (x >= 0 && y >= 0 && z >= 0) {
          voxels.push({
            x: Math.round(x),
            y: Math.round(y),
            z: Math.round(z),
            slot: shape.slot,
          });
        }
      }
    }
  }

  return voxels;
}

/**
 * 展开圆柱体
 */
function expandCylinder(shape: CylinderShape, _params?: UserParams): TemplateVoxel[] {
  const [cx, cy, cz] = shape.center;
  const r = shape.radius;
  const h = shape.height;
  const axis = shape.axis;
  const voxels: TemplateVoxel[] = [];

  // 根据轴向确定遍历范围
  let rangeAxis: [number, number];
  let range1: [number, number];
  let range2: [number, number];

  if (axis === 'z') {
    rangeAxis = [Math.floor(cz - h / 2), Math.ceil(cz + h / 2)];
    range1 = [Math.floor(cx - r), Math.ceil(cx + r)];
    range2 = [Math.floor(cy - r), Math.ceil(cy + r)];
  } else if (axis === 'y') {
    rangeAxis = [Math.floor(cy - h / 2), Math.ceil(cy + h / 2)];
    range1 = [Math.floor(cx - r), Math.ceil(cx + r)];
    range2 = [Math.floor(cz - r), Math.ceil(cz + r)];
  } else {
    rangeAxis = [Math.floor(cx - h / 2), Math.ceil(cx + h / 2)];
    range1 = [Math.floor(cy - r), Math.ceil(cy + r)];
    range2 = [Math.floor(cz - r), Math.ceil(cz + r)];
  }

  for (let a = rangeAxis[0]; a <= rangeAxis[1]; a++) {
    for (let b = range1[0]; b <= range1[1]; b++) {
      for (let c = range2[0]; c <= range2[1]; c++) {
        let x: number, y: number, z: number;
        let d1: number, d2: number;

        if (axis === 'z') {
          x = b; y = c; z = a;
          d1 = b - cx; d2 = c - cy;
        } else if (axis === 'y') {
          x = b; y = a; z = c;
          d1 = b - cx; d2 = c - cz;
        } else {
          x = a; y = b; z = c;
          d1 = b - cy; d2 = c - cz;
        }

        // 检查是否在圆内
        const dist = Math.sqrt(d1 * d1 + d2 * d2);
        if (dist <= r && x >= 0 && y >= 0 && z >= 0) {
          voxels.push({
            x: Math.round(x),
            y: Math.round(y),
            z: Math.round(z),
            slot: shape.slot,
          });
        }
      }
    }
  }

  return voxels;
}

/**
 * 应用颜色到体素
 */
export function applyColorsToVoxels(
  voxels: TemplateVoxel[],
  template: Template,
  userColors?: UserColors
): TemplateVoxel[] {
  return voxels.map(voxel => {
    // 根据slot找到对应的颜色槽
    const colorSlotName = template.slot_to_color[voxel.slot];
    if (!colorSlotName) {
      return voxel;
    }

    // 优先使用用户颜色，否则使用默认颜色
    let color: string;
    if (userColors && userColors[colorSlotName]) {
      color = userColors[colorSlotName];
    } else {
      const slotDef = template.color_slots[colorSlotName];
      color = slotDef?.default || '#888888';
    }

    return {
      ...voxel,
      color,
    };
  });
}

/**
 * 完整实例化模板
 */
export async function instantiateTemplate(
  templateId: string,
  params?: UserParams,
  colors?: UserColors
): Promise<ExpandedTemplate> {
  // 加载模板
  const template = await loadTemplate(templateId);

  // 展开形状为体素
  let voxels = expandShapesToVoxels(template.shapes, params);

  // 应用颜色
  voxels = applyColorsToVoxels(voxels, template, colors);

  // 计算实际尺寸
  let maxX = 0, maxY = 0, maxZ = 0;
  for (const v of voxels) {
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
    maxZ = Math.max(maxZ, v.z);
  }

  return {
    template,
    voxels,
    dimensions: {
      x: maxX + 1,
      y: maxY + 1,
      z: maxZ + 1,
    },
  };
}

/**
 * 将展开的模板转换为Layer格式（兼容现有渲染）
 */
export function expandedTemplateToLayers(expanded: ExpandedTemplate): import('../../types/3d/voxel').Layer[] {
  const { voxels, dimensions } = expanded;
  const layers: import('../../types/3d/voxel').Layer[] = [];

  // 按Z分组
  for (let z = 0; z < dimensions.z; z++) {
    const layerVoxels = voxels.filter(v => v.z === z);

    if (layerVoxels.length === 0) continue;

    const beads = layerVoxels.map(v => ({
      x: v.x,
      y: v.y,
      color: v.color || '#888888',
      beadId: 'template',  // 模板生成的
      beadName: v.slot,
    }));

    layers.push({
      z,
      width: dimensions.x,
      height: dimensions.y,
      beads,
    });
  }

  return layers;
}
