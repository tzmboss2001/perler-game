# 修复深度图转3D查看器Bug

## 日期
2026-02-05

## 问题描述
在 `DepthTo3DPage` 页面上传原图和深度图后点击"生成3D体素"能正常生成数据，但点击"查看3D效果"后3D查看器显示空白，控制台报错：
```
Cannot read properties of undefined (reading 'forEach')
```

## 问题原因
`depthTo3DService.ts` 服务生成的数据结构与 `Voxel3DViewer` 组件期望的数据结构不匹配：

1. 服务使用了 `LayerPixel` 类型，但查看器期望 `LayerBead` 类型
2. 服务输出 `layer.pixels`，但查看器读取 `layer.beads`
3. 缺少 `beadId` 字段（`LayerBead` 必需）
4. Layer 对象缺少 `width` 和 `height` 字段

## 解决方案
修改 `depthTo3DService.ts`：

### 1. 修改导入
```typescript
// 修改前
import { Layer, LayerPixel } from '../../types/3d/voxel';

// 修改后
import { Layer, LayerBead } from '../../types/3d/voxel';
```

### 2. 修改数据结构
```typescript
// 修改前
const layersMap = new Map<number, LayerPixel[]>();
layersMap.get(layer)!.push({
  x,
  y,
  color,
});

// 修改后
const layersMap = new Map<number, LayerBead[]>();
layersMap.get(layer)!.push({
  x,
  y,
  color,
  beadId: color,  // 使用颜色作为临时beadId
});
```

### 3. 添加 Layer 必需字段
```typescript
// 修改前
layers.push({
  z,
  beads,
});

// 修改后
layers.push({
  z,
  width: targetSize,
  height: targetSize,
  beads,
});
```

## 修改文件
- `perler-beads/src/services/3d/depthTo3DService.ts`

## 测试结果
- 上传泰迪熊原图和深度图
- 点击"生成3D体素"成功生成 1540 颗体素，8层
- 点击"查看3D效果"成功显示3D浮雕效果
- 3D模型可正常旋转、缩放、平移

## 相关功能
深度图转3D功能流程：
1. 使用 Python 脚本 `depth_estimate_algo.py` 生成深度图
2. 在页面上传原图（颜色）和深度图
3. 调整参数（目标尺寸、最大层数）
4. 生成3D体素数据
5. 查看3D浮雕效果
