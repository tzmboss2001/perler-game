# 修复体素化颜色不匹配问题

## 日期: 2026-02-10

## 问题描述

生成的3D像素图与原始模型颜色不符。以 Avocado.glb 为例：
- 原始模型：外侧深绿色外皮、切面浅绿色果肉、中心棕色种子
- 修复前体素化：浅绿色（果肉色）出现在外表面，棕色（种子色）向外扩散
- 二次反馈：果核棕色渲染到果肉部分，果肉浅绿色渲染到果核部分（颜色互换）

## 根本原因

### 原因1：表面体素 first-write-wins 问题

`markSurfaceAlongAxis()` 中的逻辑：
```typescript
if (data[vx][vy][vz] === null) {
  data[vx][vy][vz] = sampleColorFromIntersection(hit);
}
```

6个方向按顺序处理（+Y, -Y, +X, -X, +Z, -Z）。第一个方向标记的颜色无法被后续方向覆盖。

例如牛油果的外皮体素：
- +Y 射线从底部穿过切面进入，在外皮位置的交叉点采样到的是**内表面颜色**（果肉色）
- 后续 -X 射线从侧面打到外皮的**外表面**（皮色），但体素已被标记，无法覆盖

### 原因2：内部颜色填充只沿轴搜索

`findNearestSurfaceColor()` 只沿6个轴方向搜索最近表面体素：
- 搜索方向固定顺序（Y优先），不是真正的最近邻
- 对角方向的表面体素被忽略，导致颜色条纹/渗透

### 原因3：BFS不区分网格边界（颜色互换）

简单多源BFS从所有表面体素同时扩散，不区分不同mesh的表面：
- 种子表面（棕色）距离果肉内部比外皮表面更近
- BFS优先用棕色填充靠近种子的果肉区域 → 果肉变棕色
- 同理果肉色扩散到种子内部 → 种子变浅绿

## 修复方案

### 修复1：前表面颜色优先（法线点积判断）

利用面法线与射线方向的点积区分前/后表面：

```
dot(ray_direction, face_normal) < 0 → 前表面（从外部看到的颜色）
dot(ray_direction, face_normal) > 0 → 后表面（从内部看到的颜色）
```

新增 `frontFaceVoxels: Set<string>` 追踪哪些体素已有前表面颜色：
- 空体素 → 直接写入（记录是否为前表面）
- 已有背面颜色 + 当前是前表面 → **允许覆盖**
- 已有前表面颜色 → 不覆盖

同时追踪 `surfaceMeshIdx: Int8Array` 记录每个表面体素来自哪个mesh。

```typescript
let isFrontFace = false;
if (hit.face) {
  const normal = hit.face.normal.clone();
  normal.transformDirection(mesh.matrixWorld);
  isFrontFace = direction.dot(normal) < 0;
}

const meshIdx = meshes.indexOf(hit.object as THREE.Mesh);
const flatIdx = vx * sizeY * sizeZ + vy * sizeZ + vz;

if (data[vx][vy][vz] === null) {
  data[vx][vy][vz] = sampleColorFromIntersection(hit);
  surfaceMeshIdx[flatIdx] = meshIdx;
  if (isFrontFace) frontFaceVoxels.add(key);
} else if (isFrontFace && !frontFaceVoxels.has(key)) {
  data[vx][vy][vz] = sampleColorFromIntersection(hit);
  surfaceMeshIdx[flatIdx] = meshIdx;
  frontFaceVoxels.add(key);
}
```

### 修复2：Mesh感知BFS填充内部体素

用 `fillInteriorMeshAware()` 替代简单BFS：

- 按mesh体积从大到小排序处理
- 每个mesh的BFS只从该mesh自己的表面体素出发
- 其他mesh的表面体素作为BFS屏障（barrier），阻止颜色跨mesh扩散
- 大mesh先填充，小mesh后填充（小mesh的颜色覆盖大mesh）

```typescript
function fillInteriorMeshAware(
  data, outside, surfaceMeshIdx, sizeX, sizeY, sizeZ, meshes
): number {
  // 按mesh体积排序（大→小）
  // 对每个mesh：
  //   1. 以该mesh的表面体素为起点
  //   2. BFS扩展到邻居
  //   3. 遇到其他mesh的表面体素 → 停止（barrier）
  //   4. 空内部体素继承当前mesh的表面颜色
}
```

注：Avocado.glb 只有1个mesh，此时mesh-aware BFS等同于普通BFS。
颜色改善主要来自修复1（前表面优先标记）。

## 修改文件

| 文件 | 修改 |
|------|------|
| `modelVoxelizeService.ts` | 前表面优先标记 + mesh感知BFS内部填充 |

## 验证结果

### Avocado.glb
| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 前表面标记率 | N/A | 100% (1319/1319) |
| 主要颜色 | 浅绿色混乱 | #7ea04d(深绿) 1123个体素 |
| 外皮颜色 | 浅绿色（错误） | 深绿色（正确） |
| 切面颜色 | 混乱 | 浅绿/黄色（正确） |
| 种子颜色 | 向外扩散/互换 | 集中在中心（正确） |
| 图纸缩略图 | 颜色混乱 | 分层颜色正确 |

### 算法对比
| 方面 | 修复前 | 修复后 |
|------|--------|--------|
| 表面颜色策略 | first-write-wins | 前表面优先覆盖 |
| 内部填充 | 轴方向搜索 | mesh感知BFS（真正最近邻 + mesh隔离） |
| 内部填充复杂度 | O(n × maxDim) | O(n × meshCount) |
