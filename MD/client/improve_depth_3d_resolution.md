# 深度图转3D功能优化

## 日期
2026-02-05

## 问题描述
1. 用户希望提升目标尺寸以获得更好的细节效果
2. 用户发现虽然显示8层，但前6层都一样，只有最上面2层有变化，导致效果像"加厚的平面"

## 修改内容

### 修改1：提升默认分辨率
将 `DepthTo3DPage.tsx` 中的默认目标尺寸从 32×32 提升到 64×64。

```typescript
// 修改前
const [targetSize, setTargetSize] = useState(32);

// 修改后
const [targetSize, setTargetSize] = useState(64);
```

### 修改2：改为表面渲染模式
将 `depthTo3DService.ts` 的体素填充逻辑从"实心填充"改为"表面渲染"。

```typescript
// 修改前：实心填充模式（从第1层填充到z层）
for (let layer = 1; layer <= z; layer++) {
  layersMap.get(layer)!.push({ x, y, color, beadId: color });
  voxelCount++;
}

// 修改后：表面渲染模式（只在z层放置体素）
if (!layersMap.has(z)) {
  layersMap.set(z, []);
}
layersMap.get(z)!.push({ x, y, color, beadId: color });
voxelCount++;
```

### 修改文件
- `perler-beads/src/pages/mobile/3d/DepthTo3DPage.tsx`
- `perler-beads/src/services/3d/depthTo3DService.ts`

## 测试结果

### 测试图片
- 原图：`teddy.webp`（泰迪熊图片）
- 深度图：`teddy_depth_grey.png`（AI生成的灰度深度图）

### 渲染模式对比

| 模式 | 体素总数 | 层数 | 效果 |
|------|----------|------|------|
| 实心填充 | 6341 颗 | 8 层 | 底层几乎一样，像加厚的平面 |
| 表面渲染 | 1034 颗 | 7 层 | 真正的浮雕，高低起伏明显 |

### 表面渲染效果
- 头部/面部明显高于手臂和腿部
- 不同部位有明显的高度差异
- 是真正的3D浮雕效果
- 体素数量大幅减少（约1/6）

## 深度图生成方法
使用 AI 深度估计模型（Depth Anything V2）生成深度图：
1. 输入原始彩色图片
2. AI 模型输出灰度深度图
3. 灰度值越亮表示距离越近（Z值越大）
4. 灰度值为0表示背景

## 相关文件
- `perler-beads/src/services/3d/depthTo3DService.ts` - 深度图转体素服务
- `perler-beads/src/components/3d/Voxel3DViewer.tsx` - 3D查看器组件
- `perler-beads/public/teddy.webp` - 测试原图
- `perler-beads/public/teddy_depth_grey.png` - 测试深度图

## 最终方案：带厚度的表面渲染

### 问题
- 实心填充模式：底层几乎一样，没有浮雕效果
- 纯表面模式：太薄，没有立体感

### 解决方案
实现"带厚度的表面"模式，每个像素渲染3层厚度：

```typescript
// 带厚度的表面渲染模式：从 (z-thickness+1) 到 z 层放置体素
const surfaceThickness = 3; // 表面厚度为3层
const startLayer = Math.max(1, z - surfaceThickness + 1);
for (let layer = startLayer; layer <= z; layer++) {
  layersMap.get(layer)!.push({ x, y, color, beadId: color });
  voxelCount++;
}
```

### 三种模式对比

| 模式 | 体素数 | 层数 | 效果 |
|------|--------|------|------|
| 实心填充 | 6341 | 8 | 底层一样，像加厚平面 |
| 纯表面 | 1034 | 7 | 有浮雕但太薄 |
| **带厚度表面** | **3088** | **8** | **既有浮雕又有立体感** ✓ |

### 最终效果
- 熊的头部/面部明显高于手臂和腿部
- 模型有一定厚度，不会太薄
- 底部有支撑结构，整体更立体
- 是真正的3D浮雕效果
