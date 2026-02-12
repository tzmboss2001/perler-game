# 修复纹理贴图颜色采样 + UI改进

## 日期: 2026-02-11

## 问题描述

### 颜色问题
图纸（层详情和缩略图）显示灰白色珠子，而非模型的实际颜色。例如 Avocado.glb 应显示绿色/棕色，Duck.glb 应显示黄色/白色/黑色。

### 根本原因

`sampleColorFromIntersection()` 函数只处理了两种颜色来源：
1. 顶点颜色 (`geometry.attributes.color`)
2. 材质基础色 (`material.color`)

**缺失了第三种（最常见的）来源：纹理贴图 (`material.map`)**

大多数 GLB 模型使用纹理贴图来着色。当模型有纹理时，`material.color` 通常是白色 `#ffffff`，实际颜色数据在纹理中。

```
颜色来源优先级（修复前）：
1. 顶点颜色 → Duck.glb 使用这个
2. material.color → 纹理模型返回 #ffffff（白色）
3. 默认 #888888（灰色）

颜色来源优先级（修复后）：
1. 顶点颜色 → Duck.glb 使用这个
2. 纹理贴图 UV 采样 → Avocado.glb 使用这个 ✓ 新增
3. material.color
4. 默认 #888888
```

### 修复方案

**新增纹理采样系统**：

1. `textureDataCache: Map<THREE.Texture, ImageData>` — 纹理 ImageData 缓存
2. `getTextureImageData()` — 将纹理绘制到 Canvas 获取像素数据（带缓存）
3. `sampleTextureAtUV()` — 在 UV 坐标处采样纹理颜色
4. `sampleColorFromIntersection()` — 添加纹理采样路径

关键采样逻辑：
```typescript
// 优先级2：从纹理贴图采样
if (material && material.map && intersection.uv) {
  const texColor = sampleTextureAtUV(material.map, intersection.uv);
  if (texColor) {
    // 材质 baseColor 乘数与纹理颜色相乘
    if (material.color) texColor.multiply(material.color);
    return '#' + texColor.getHexString();
  }
}
```

UV 坐标处理：
- UV 范围 [0,1] → 像素坐标
- 处理 UV 循环（负值和 >1 的值）
- V 轴翻转（UV 从下往上，像素从上往下）

### 体素化完成后清理缓存
```typescript
textureDataCache.clear();
```

### 颜色分布诊断日志
新增输出 TOP10 颜色分布，便于验证颜色采样效果。

## UI改进

### 1. 多模型支持
- 新增 Avocado.glb 示例按钮（与 Duck 并列）

### 2. 左右滑动浏览图纸
- 重写 `ContourSliceDetailModal` 组件
- 支持左右箭头按钮导航
- 支持键盘方向键（← →）切换
- 支持触摸滑动手势（50px 阈值，区分水平/垂直）
- 显示当前位置指示器（如 "10/32"）
- ESC 键关闭

## 修改文件

| 文件 | 修改 |
|------|------|
| `modelVoxelizeService.ts` | 新增纹理采样系统、缓存、颜色诊断日志 |
| `ModelTo3DPage.tsx` | Avocado按钮、滑动浏览Modal |

## 验证结果

### Avocado.glb (纹理贴图模型)
| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 主要颜色 | #ffffff(白色) | #7ea04d(绿色) |
| 颜色丰富度 | 1-2种灰白色 | 10+种绿/黄色 |
| 视觉效果 | 全灰白 | 绿色外皮 + 黄色果肉 |

### Duck.glb (顶点颜色模型)
| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 主要颜色 | 已有黄色 | #ffed00(黄) + #000000(黑) + #ffffff(白) |
| 视觉效果 | 有基本颜色 | 保持不变（向后兼容） |
