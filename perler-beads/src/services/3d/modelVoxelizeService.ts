/**
 * 模型体素化服务
 * 加载 GLB 模型 → 光线投射体素化
 *
 * 算法：表面标记 + 洪水填充
 * 1. 6方向射线标记表面体素
 * 2. 从外部边界洪水填充标记"外部"体素
 * 3. 剩余空体素 = 内部 = 填充
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** 体素网格数据 */
export interface VoxelGrid {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  data: (string | null)[][][]; // [x][y][z] = hex color or null
}

/** 体素化进度回调 */
export type VoxelizeProgress = (percent: number, message: string) => void;

/**
 * 加载 GLB 模型并返回 Three.js Group
 */
export async function loadGLBModel(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (error) => reject(new Error(`加载模型失败: ${error}`))
    );
  });
}

/**
 * 纹理 ImageData 缓存，避免每次采样都重新绘制 canvas
 */
const textureDataCache = new Map<THREE.Texture, ImageData>();

/**
 * 从纹理中获取 ImageData（带缓存）
 */
function getTextureImageData(texture: THREE.Texture): ImageData | null {
  if (textureDataCache.has(texture)) {
    return textureDataCache.get(texture)!;
  }

  const image = texture.image;
  if (!image) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    textureDataCache.set(texture, imageData);
    return imageData;
  } catch {
    return null;
  }
}

/**
 * 在纹理的 UV 坐标处采样颜色
 *
 * Canvas getImageData() 返回 sRGB 像素值。
 * 使用 setRGB(r, g, b, SRGBColorSpace) 正确告知 THREE.Color 输入色彩空间，
 * 这样 getHexString() 的 linear→sRGB 转换能正确还原原始 sRGB 值。
 *
 * 关键：必须处理 texture.flipY 和 UV 变换（offset/repeat/rotation）
 * - GLTF 纹理 flipY=false：v=0 → 图片顶部（GLTF 规范 UV 原点在左上角）
 * - 标准纹理 flipY=true：v=0 → 图片底部（OpenGL 惯例 UV 原点在左下角）
 */
function sampleTextureAtUV(texture: THREE.Texture, uv: THREE.Vector2): THREE.Color | null {
  const imageData = getTextureImageData(texture);
  if (!imageData) return null;

  // 应用纹理 UV 变换（处理 offset, repeat, rotation）
  texture.updateMatrix();
  const transformedUV = uv.clone();
  transformedUV.applyMatrix3(texture.matrix);

  // Wrap to [0,1]
  let u = transformedUV.x % 1;
  let v = transformedUV.y % 1;
  if (u < 0) u += 1;
  if (v < 0) v += 1;

  const px = Math.floor(u * (imageData.width - 1));

  // flipY 控制纹理垂直方向：
  // Canvas getImageData: y=0 = 图片文件顶部
  // - flipY=true (标准纹理): GPU 翻转上传，v=0 → 图片底部 → py = height-1
  // - flipY=false (GLTF纹理): GPU 不翻转，v=0 → 图片顶部 → py = 0
  const py = texture.flipY
    ? Math.floor((1 - v) * (imageData.height - 1))
    : Math.floor(v * (imageData.height - 1));

  const idx = (py * imageData.width + px) * 4;
  const r = imageData.data[idx] / 255;
  const g = imageData.data[idx + 1] / 255;
  const b = imageData.data[idx + 2] / 255;

  const color = new THREE.Color();
  color.setRGB(r, g, b, THREE.SRGBColorSpace);
  return color;
}

/**
 * 从交叉点采样颜色
 */
function sampleColorFromIntersection(intersection: THREE.Intersection): string {
  const mesh = intersection.object as THREE.Mesh;
  const material = mesh.material as THREE.MeshStandardMaterial;

  // 优先级1：尝试从顶点颜色获取
  const geometry = mesh.geometry;
  if (geometry.attributes.color && intersection.face) {
    const colorAttr = geometry.attributes.color;
    const face = intersection.face;
    const color = new THREE.Color();

    const c1 = new THREE.Color().fromBufferAttribute(colorAttr, face.a);
    const c2 = new THREE.Color().fromBufferAttribute(colorAttr, face.b);
    const c3 = new THREE.Color().fromBufferAttribute(colorAttr, face.c);
    color.setRGB(
      (c1.r + c2.r + c3.r) / 3,
      (c1.g + c2.g + c3.g) / 3,
      (c1.b + c2.b + c3.b) / 3
    );
    return '#' + color.getHexString();
  }

  // 优先级2：从纹理贴图采样（大多数GLB模型使用纹理）
  if (material && material.map && intersection.uv) {
    const texColor = sampleTextureAtUV(material.map, intersection.uv);
    if (texColor) {
      if (material.color) {
        texColor.multiply(material.color);
      }
      return '#' + texColor.getHexString();
    }
  }

  // 优先级3：从材质基础色获取
  if (material && material.color) {
    return '#' + material.color.getHexString();
  }

  return '#888888';
}

/**
 * 收集场景中所有可被射线检测的 mesh
 */
function collectMeshes(scene: THREE.Group): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // 确保几何体有计算好的包围盒
      child.geometry.computeBoundingBox();
      // 确保世界矩阵是最新的
      child.updateMatrixWorld(true);
      meshes.push(child);
    }
  });
  return meshes;
}

/** 射线诊断数据 */
interface RayDiagnostics {
  total: number;
  hitCounts: Record<number, number>;
  oddHits: number;
  multiSegment: number;
}

/**
 * 表面标记射线扫描 - 6个方向共用
 * 沿指定轴方向投射射线，标记所有射线命中点为表面体素
 * 不做配对/填充逻辑，只标记表面
 */
function markSurfaceAlongAxis(
  data: (string | null)[][][],
  frontFaceVoxels: Set<string>,
  surfaceMeshIdx: Int8Array,
  boundingBox: THREE.Box3,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  voxelSizeX: number,
  voxelSizeY: number,
  voxelSizeZ: number,
  meshes: THREE.Mesh[],
  axis: 'x' | 'y' | 'z',
  positive: boolean,
  diag: RayDiagnostics
): void {
  const raycaster = new THREE.Raycaster();
  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  const direction = new THREE.Vector3(
    axis === 'x' ? (positive ? 1 : -1) : 0,
    axis === 'y' ? (positive ? 1 : -1) : 0,
    axis === 'z' ? (positive ? 1 : -1) : 0
  );

  let outerSize: number, innerSize: number;
  let getOrigin: (o: number, i: number) => THREE.Vector3;
  let getFar: () => number;
  let worldToVoxel: (point: THREE.Vector3) => number;
  let getVoxelCoord: (o: number, i: number, rayIdx: number) => [number, number, number];
  let axisSize: number;

  if (axis === 'y') {
    outerSize = sizeX;
    innerSize = sizeZ;
    axisSize = sizeY;
    getFar = () => size.y + 2;
    getOrigin = (ox, iz) => new THREE.Vector3(
      boundingBox.min.x + (ox + 0.5) * voxelSizeX,
      positive ? boundingBox.min.y - 1 : boundingBox.max.y + 1,
      boundingBox.min.z + (iz + 0.5) * voxelSizeZ
    );
    worldToVoxel = (point) => Math.floor((point.y - boundingBox.min.y) / voxelSizeY);
    getVoxelCoord = (o, i, r) => [o, r, i];
  } else if (axis === 'x') {
    outerSize = sizeY;
    innerSize = sizeZ;
    axisSize = sizeX;
    getFar = () => size.x + 2;
    getOrigin = (oy, iz) => new THREE.Vector3(
      positive ? boundingBox.min.x - 1 : boundingBox.max.x + 1,
      boundingBox.min.y + (oy + 0.5) * voxelSizeY,
      boundingBox.min.z + (iz + 0.5) * voxelSizeZ
    );
    worldToVoxel = (point) => Math.floor((point.x - boundingBox.min.x) / voxelSizeX);
    getVoxelCoord = (o, i, r) => [r, o, i];
  } else {
    // axis === 'z'
    outerSize = sizeX;
    innerSize = sizeY;
    axisSize = sizeZ;
    getFar = () => size.z + 2;
    getOrigin = (ox, iy) => new THREE.Vector3(
      boundingBox.min.x + (ox + 0.5) * voxelSizeX,
      boundingBox.min.y + (iy + 0.5) * voxelSizeY,
      positive ? boundingBox.min.z - 1 : boundingBox.max.z + 1
    );
    worldToVoxel = (point) => Math.floor((point.z - boundingBox.min.z) / voxelSizeZ);
    getVoxelCoord = (o, i, r) => [o, i, r];
  }

  const far = getFar();

  for (let o = 0; o < outerSize; o++) {
    for (let i = 0; i < innerSize; i++) {
      const origin = getOrigin(o, i);
      raycaster.set(origin, direction);
      raycaster.far = far;

      const intersections = raycaster.intersectObjects(meshes, false);

      // 诊断记录
      diag.total++;
      diag.hitCounts[intersections.length] = (diag.hitCounts[intersections.length] || 0) + 1;
      if (intersections.length % 2 === 1 && intersections.length > 0) diag.oddHits++;
      if (intersections.length >= 4) diag.multiSegment++;

      if (intersections.length === 0) continue;

      // 标记所有射线命中点为表面体素（优先保留前表面颜色）
      for (const hit of intersections) {
        const voxelIdx = worldToVoxel(hit.point);
        if (voxelIdx >= 0 && voxelIdx < axisSize) {
          const [vx, vy, vz] = getVoxelCoord(o, i, voxelIdx);

          // 判断是否为前表面命中（射线从外部打到模型表面）
          // dot(ray_direction, face_normal) < 0 → 前表面（外部可见）
          // dot(ray_direction, face_normal) > 0 → 后表面（内部可见）
          let isFrontFace = false;
          if (hit.face) {
            const normal = hit.face.normal.clone();
            const mesh = hit.object as THREE.Mesh;
            normal.transformDirection(mesh.matrixWorld);
            isFrontFace = direction.dot(normal) < 0;
          }

          const key = `${vx},${vy},${vz}`;
          const meshIdx = meshes.indexOf(hit.object as THREE.Mesh);
          const flatIdx = vx * sizeY * sizeZ + vy * sizeZ + vz;

          if (data[vx][vy][vz] === null) {
            // 空体素 → 直接写入颜色
            data[vx][vy][vz] = sampleColorFromIntersection(hit);
            surfaceMeshIdx[flatIdx] = meshIdx;
            if (isFrontFace) frontFaceVoxels.add(key);
          } else if (isFrontFace && !frontFaceVoxels.has(key)) {
            // 当前是前表面命中，但已有颜色来自背面 → 用外表面颜色覆盖
            data[vx][vy][vz] = sampleColorFromIntersection(hit);
            surfaceMeshIdx[flatIdx] = meshIdx;
            frontFaceVoxels.add(key);
          }
        }
      }
    }
  }

}

/**
 * 从外部边界BFS洪水填充，标记所有可从网格边界到达的空体素为"外部"
 * 表面体素作为屏障阻止洪水蔓延
 */
function floodFillOutside(
  data: (string | null)[][][],
  sizeX: number,
  sizeY: number,
  sizeZ: number
): boolean[][][] {
  // 创建 outside 标记数组
  const outside: boolean[][][] = [];
  for (let x = 0; x < sizeX; x++) {
    outside[x] = [];
    for (let y = 0; y < sizeY; y++) {
      outside[x][y] = new Array(sizeZ).fill(false);
    }
  }

  // BFS 队列（用数组模拟，每3个元素为一组 x,y,z）
  const queue: number[] = [];

  const enqueue = (x: number, y: number, z: number) => {
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) return;
    if (outside[x][y][z]) return;
    if (data[x][y][z] !== null) return; // 表面体素，不穿透
    outside[x][y][z] = true;
    queue.push(x, y, z);
  };

  // 从6个面的所有边界体素开始
  // X = 0 和 X = sizeX-1
  for (let y = 0; y < sizeY; y++) {
    for (let z = 0; z < sizeZ; z++) {
      enqueue(0, y, z);
      enqueue(sizeX - 1, y, z);
    }
  }
  // Y = 0 和 Y = sizeY-1
  for (let x = 0; x < sizeX; x++) {
    for (let z = 0; z < sizeZ; z++) {
      enqueue(x, 0, z);
      enqueue(x, sizeY - 1, z);
    }
  }
  // Z = 0 和 Z = sizeZ-1
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      enqueue(x, y, 0);
      enqueue(x, y, sizeZ - 1);
    }
  }

  // BFS 扩散
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const z = queue[head++];

    enqueue(x - 1, y, z);
    enqueue(x + 1, y, z);
    enqueue(x, y - 1, z);
    enqueue(x, y + 1, z);
    enqueue(x, y, z - 1);
    enqueue(x, y, z + 1);
  }

  return outside;
}

/**
 * 网格感知的分层BFS填充内部体素
 *
 * 核心思路：按mesh体积从大到小依次BFS，其他mesh的表面作为屏障
 * - 大mesh（牛油果身体）先BFS → 填充果肉区
 * - 小mesh（种子）后BFS → 覆盖种子区
 * - 种子表面阻止身体BFS进入种子内部，防止颜色渗透
 */
function fillInteriorMeshAware(
  data: (string | null)[][][],
  outside: boolean[][][],
  surfaceMeshIdx: Int8Array,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  meshes: THREE.Mesh[]
): number {
  const totalVoxels = sizeX * sizeY * sizeZ;
  const idx = (x: number, y: number, z: number) => x * sizeY * sizeZ + y * sizeZ + z;

  // 按包围盒体积排序mesh（大→小）
  const meshOrder: { meshIdx: number; volume: number }[] = meshes.map((m, i) => {
    const box = new THREE.Box3().setFromObject(m);
    const s = new THREE.Vector3();
    box.getSize(s);
    return { meshIdx: i, volume: s.x * s.y * s.z };
  });
  meshOrder.sort((a, b) => b.volume - a.volume);

  console.log('[填充] mesh排序(大→小):', meshOrder.map(m => `mesh${m.meshIdx}(vol=${m.volume.toFixed(4)})`).join(', '));

  // 追踪哪些体素已被BFS填充（区分"表面"和"BFS填充"）
  // 0=未填充, 1=已被某mesh的BFS填充
  const bfsFilled = new Uint8Array(totalVoxels);
  let totalFilled = 0;

  for (const { meshIdx } of meshOrder) {
    // 该mesh的BFS访问标记
    const visited = new Uint8Array(totalVoxels);
    const queue: number[] = [];

    // 种子队列：该mesh的表面体素
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const fi = idx(x, y, z);
          if (surfaceMeshIdx[fi] === meshIdx) {
            queue.push(x, y, z);
            visited[fi] = 1;
          }
        }
      }
    }

    let meshFilled = 0;
    let head = 0;

    while (head < queue.length) {
      const cx = queue[head++];
      const cy = queue[head++];
      const cz = queue[head++];
      const color = data[cx][cy][cz]!;

      const neighbors: [number, number, number][] = [
        [cx - 1, cy, cz], [cx + 1, cy, cz],
        [cx, cy - 1, cz], [cx, cy + 1, cz],
        [cx, cy, cz - 1], [cx, cy, cz + 1],
      ];

      for (const [nx, ny, nz] of neighbors) {
        if (nx < 0 || nx >= sizeX || ny < 0 || ny >= sizeY || nz < 0 || nz >= sizeZ) continue;

        const nfi = idx(nx, ny, nz);
        if (visited[nfi]) continue; // 已被本mesh的BFS访问
        visited[nfi] = 1;

        if (outside[nx][ny][nz]) continue; // 外部

        // 其他mesh的表面体素 = 屏障，不穿越
        const neighborSurfMesh = surfaceMeshIdx[nfi];
        if (neighborSurfMesh >= 0 && neighborSurfMesh !== meshIdx) continue;

        // 自身的表面体素：已在队列中作为种子，跳过
        if (neighborSurfMesh === meshIdx) continue;

        // 内部空体素 或 被之前(更大)mesh BFS填充的体素 → 填充/覆盖
        const wasNull = data[nx][ny][nz] === null;
        data[nx][ny][nz] = color;
        bfsFilled[nfi] = 1;
        if (wasNull) totalFilled++;
        meshFilled++;
        queue.push(nx, ny, nz);
      }
    }

    console.log(`[填充] mesh${meshIdx}: BFS填充 ${meshFilled} 体素`);
  }

  return totalFilled;
}

/**
 * 光线投射体素化（表面标记 + 洪水填充）
 *
 * Phase 1: 6方向射线标记表面体素
 * Phase 2: 洪水填充标记外部空间
 * Phase 3: 填充内部体素
 */
export async function voxelizeModel(
  scene: THREE.Group,
  resolution: number = 32,
  onProgress?: VoxelizeProgress
): Promise<VoxelGrid> {
  onProgress?.(0, '准备模型...');

  // 更新所有世界矩阵
  scene.updateMatrixWorld(true);

  // 计算整体包围盒
  const boundingBox = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);

  // 确定分辨率：最长边为 resolution，其他方向按比例
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) {
    throw new Error('模型尺寸为零');
  }

  const scale = resolution / maxDim;
  // 增加 2 体素的边距（每边 1），确保洪水填充能从边界开始
  const sizeX = Math.max(1, Math.round(size.x * scale)) + 2;
  const sizeY = Math.max(1, Math.round(size.y * scale)) + 2;
  const sizeZ = Math.max(1, Math.round(size.z * scale)) + 2;

  // 每个体素的实际尺寸（基于原始模型尺寸，不含边距）
  const innerSizeX = sizeX - 2;
  const innerSizeY = sizeY - 2;
  const innerSizeZ = sizeZ - 2;
  const voxelSizeX = size.x / innerSizeX;
  const voxelSizeY = size.y / innerSizeY;
  const voxelSizeZ = size.z / innerSizeZ;

  // 扩展包围盒以包含边距
  const paddedBox = boundingBox.clone();
  paddedBox.min.x -= voxelSizeX;
  paddedBox.min.y -= voxelSizeY;
  paddedBox.min.z -= voxelSizeZ;
  paddedBox.max.x += voxelSizeX;
  paddedBox.max.y += voxelSizeY;
  paddedBox.max.z += voxelSizeZ;

  // 初始化数据
  const data: (string | null)[][][] = [];
  for (let x = 0; x < sizeX; x++) {
    data[x] = [];
    for (let y = 0; y < sizeY; y++) {
      data[x][y] = new Array(sizeZ).fill(null);
    }
  }

  // 收集所有 mesh
  const meshes = collectMeshes(scene);
  if (meshes.length === 0) {
    throw new Error('模型中没有找到有效的网格');
  }

  // ==============================
  // Phase 1: 6方向射线标记表面体素
  // ==============================
  const directions: { axis: 'x' | 'y' | 'z'; positive: boolean; label: string }[] = [
    { axis: 'y', positive: true, label: '+Y' },
    { axis: 'y', positive: false, label: '-Y' },
    { axis: 'x', positive: true, label: '+X' },
    { axis: 'x', positive: false, label: '-X' },
    { axis: 'z', positive: true, label: '+Z' },
    { axis: 'z', positive: false, label: '-Z' },
  ];

  const allDiag: Record<string, RayDiagnostics> = {};
  // 追踪哪些表面体素已有前表面（外部可见）颜色，用于颜色优先级判断
  const frontFaceVoxels = new Set<string>();
  // 追踪每个表面体素属于哪个mesh（-1=非表面）
  const surfaceMeshIdx = new Int8Array(sizeX * sizeY * sizeZ).fill(-1);

  for (let d = 0; d < directions.length; d++) {
    const { axis, positive, label } = directions[d];
    const diag: RayDiagnostics = { total: 0, hitCounts: {}, oddHits: 0, multiSegment: 0 };
    allDiag[label] = diag;

    const percent = Math.round(((d + 1) / directions.length) * 60);
    onProgress?.(percent, `${label} 方向表面标记...`);

    markSurfaceAlongAxis(
      data, frontFaceVoxels, surfaceMeshIdx, paddedBox, sizeX, sizeY, sizeZ,
      voxelSizeX, voxelSizeY, voxelSizeZ,
      meshes, axis, positive, diag
    );

    // 让出主线程
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // 统计表面体素
  let surfaceVoxels = 0;
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        if (data[x][y][z] !== null) surfaceVoxels++;
      }
    }
  }
  console.log(`[体素化] Phase 1 完成: 表面体素 ${surfaceVoxels}, 前表面标记 ${frontFaceVoxels.size}`);

  // ==============================
  // Phase 2: 洪水填充标记外部空间
  // ==============================
  onProgress?.(70, '洪水填充标记外部...');
  const outside = floodFillOutside(data, sizeX, sizeY, sizeZ);

  let outsideCount = 0;
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        if (outside[x][y][z]) outsideCount++;
      }
    }
  }
  const totalCells = sizeX * sizeY * sizeZ;
  console.log(`[体素化] Phase 2 完成: 外部 ${outsideCount}, 表面 ${surfaceVoxels}, 潜在内部 ${totalCells - outsideCount - surfaceVoxels}`);

  // ==============================
  // Phase 3: 网格感知BFS填充内部体素
  // ==============================
  onProgress?.(80, '填充内部体素...');
  const interiorFilled = fillInteriorMeshAware(data, outside, surfaceMeshIdx, sizeX, sizeY, sizeZ, meshes);
  console.log(`[体素化] Phase 3 完成: 内部填充 ${interiorFilled}, 总体素 ${surfaceVoxels + interiorFilled}`);

  onProgress?.(90, '诊断分析...');

  // 诊断：分析体素网格中每列(x,z)的Y方向段数
  const colDiag = {
    totalCols: 0, multiSegCols: 0, maxSegs: 0,
    segHistogram: {} as Record<number, number>,
  };
  for (let x = 0; x < sizeX; x++) {
    for (let z = 0; z < sizeZ; z++) {
      colDiag.totalCols++;
      let segs = 0, inSeg = false;
      for (let y = 0; y < sizeY; y++) {
        const filled = data[x][y][z] !== null;
        if (filled && !inSeg) { inSeg = true; segs++; }
        else if (!filled && inSeg) { inSeg = false; }
      }
      colDiag.segHistogram[segs] = (colDiag.segHistogram[segs] || 0) + 1;
      if (segs > 1) {
        colDiag.multiSegCols++;
        if (segs > colDiag.maxSegs) colDiag.maxSegs = segs;
      }
    }
  }

  // 输出诊断日志
  console.log('[体素化诊断] 6方向射线统计:');
  for (const [label, diag] of Object.entries(allDiag)) {
    const singleHit = diag.hitCounts[1] || 0;
    const singlePct = diag.total > 0 ? ((singleHit / diag.total) * 100).toFixed(1) : '0';
    console.log(`  ${label}: 总${diag.total}, 交叉分布=${JSON.stringify(diag.hitCounts)}, 1次交叉=${singlePct}%, 奇数=${diag.oddHits}`);
  }
  console.log('[体素化诊断] 体素列段数:', JSON.stringify(colDiag.segHistogram));
  console.log('[体素化诊断] 多段列:', colDiag.multiSegCols, '/', colDiag.totalCols);
  (window as any).__voxelRayDiag = allDiag;
  (window as any).__voxelColDiag = colDiag;

  // 颜色分布统计
  const colorStats = new Map<string, number>();
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        const c = data[x][y][z];
        if (c) colorStats.set(c, (colorStats.get(c) || 0) + 1);
      }
    }
  }
  const topColors = [...colorStats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('[体素化诊断] 颜色分布 TOP10:', topColors.map(([c, n]) => `${c}(${n})`).join(', '));

  // 清理纹理缓存
  textureDataCache.clear();

  onProgress?.(100, '体素化完成！');

  return { sizeX, sizeY, sizeZ, data };
}


/**
 * 统计体素数据信息
 */
export function getVoxelStats(grid: VoxelGrid): {
  totalVoxels: number;
  colorCounts: Map<string, number>;
  filledRatio: number;
} {
  let totalVoxels = 0;
  const colorCounts = new Map<string, number>();
  const totalCells = grid.sizeX * grid.sizeY * grid.sizeZ;

  for (let x = 0; x < grid.sizeX; x++) {
    for (let y = 0; y < grid.sizeY; y++) {
      for (let z = 0; z < grid.sizeZ; z++) {
        const color = grid.data[x][y][z];
        if (color !== null) {
          totalVoxels++;
          colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        }
      }
    }
  }

  return {
    totalVoxels,
    colorCounts,
    filledRatio: totalCells > 0 ? totalVoxels / totalCells : 0,
  };
}
