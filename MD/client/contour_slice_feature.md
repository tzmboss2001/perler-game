# 等高线镂空切片功能

## 修改日期
2026-02-09

## 修改概述
新增「等高线镂空」切片模式，作为原有「十字插片」的替代方案。水平逐层切片，每层只保留外壳轮廓（镂空），层与层之间通过卡榫/凹槽对齐连接。

## 新建文件

### `src/services/3d/contourSliceService.ts`
等高线镂空切片算法服务，包含以下核心函数：

| 函数 | 说明 |
|------|------|
| `extractHorizontalLayer(grid, y)` | 从 VoxelGrid 提取第 y 层的 XZ 平面 |
| `extractContour(layer, thickness)` | 从实心层提取外壳轮廓（支持可配置壳厚度） |
| `addAlignmentFeatures(layer, originalLayer, layerIndex)` | 在轮廓上添加卡榫/凹槽 |
| `generateContourSlices(grid, config)` | 主流程：遍历所有 Y 层，生成全部切片 |
| `renderContourSliceToCanvas(slice, cellSize)` | 渲染单层图纸（含卡榫标记） |
| `getContourSliceStats(slices)` | 计算切片统计信息 |

### 数据结构
- `ContourSlice`：单层切片数据（id, layerIndex, pixels, alignmentPoints, beadCount, isSolid）
- `AlignmentPoint`：对齐点（row, col, type: 'tab'|'slot'）
- `ContourSliceConfig`：配置（shellThickness, enableAlignment）

### 算法说明

**轮廓提取**：
- 4邻域边缘检测：有颜色且至少一个邻居为空或越界
- 壳厚度 > 1 时使用多次腐蚀法
- 最小壳厚度为2珠宽，确保结构强度

**实心层判定**（结构强度优化）：
- 底层（第1层）：始终保持实心，作为整体底座
- 顶层（最后一层）：始终保持实心，封顶
- 太小的层：通过 `getLayerSpan()` 函数计算层的包围盒最小边长，若 < shellThickness*2+1 则保持实心
- `getLayerSpan()`：计算层内有色像素的包围盒尺寸，取宽高较小值

**层间卡榫连接**：
- 偶数层：凸起（tab）- 向外多加珠子
- 奇数层：凹槽（slot）- 向内挖掉珠子
- 卡榫数量根据层面积自动计算（小层2个，中层4个，大层6个）
- 卡榫位置沿轮廓均匀分布

## 修改文件

### `src/pages/mobile/3d/ModelTo3DPage.tsx`
- 添加切片模式切换 UI：「十字插片」vs「等高线镂空」
- 等高线模式专用参数：壳厚度（2珠/3珠/4珠，默认3珠）、层间卡榫开关
- 新增 `ContourSliceThumbnail` 缩略图组件（绿色主题）
- 新增 `ContourSliceDetailModal` 详情弹窗
- 结果展示：逐层缩略图列表（标注层号、珠子数、实心标记）
- 统计信息：总层数、总珠子数、最大层尺寸
- 导出功能：支持导出所有等高线图纸

## UI 设计
- 十字插片模式：粉红色主题（#f5576c）
- 等高线模式：绿色主题（#43e97b）
- 切片模式切换按钮位于参数设置区顶部
- 壳厚度使用 chip 按钮选择（2珠/3珠/4珠）
- 卡榫对齐使用自定义 toggle 开关
- 实心层用黄色 "实心" 标签标识

## 测试结果（Duck.glb, 分辨率32, 壳厚度3珠）
- 体素网格：32×30×22，体素数量 3786
- 切片结果：25层
  - Layer-1：实心（底层，334颗）
  - Layer-2 ~ Layer-21：镂空层
  - Layer-22 ~ Layer-25：实心（顶部小层）
- 总珠子数：3668（相比原始体素3786，节省约3%）
- 无控制台错误
