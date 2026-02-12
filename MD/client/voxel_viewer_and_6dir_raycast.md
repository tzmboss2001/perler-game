# 体素化质量验证 + 算法重构

## 日期: 2026-02-10

## 修改内容

### Phase 1: 3D体素查看器组件

**新建文件**: `perler-beads/src/components/3d/VoxelViewer.tsx`

- 创建 Three.js 3D体素渲染组件
- 使用 `InstancedMesh` 按颜色分组渲染体素方块（性能优化）
- 支持 OrbitControls 旋转/缩放
- 自动居中模型，添加坐标轴辅助线
- 组件卸载时正确清理 Three.js 资源

**修改文件**: `perler-beads/src/pages/mobile/3d/ModelTo3DPage.tsx`

- 在"体素化结果"统计区域下方集成 VoxelViewer 组件
- 条件渲染：voxelGrid 不为 null 时显示
- 用户可以在同一页面对比原始GLB模型和体素化结果

### Phase 2: 体素化算法重构 — 表面标记 + 洪水填充

**修改文件**: `perler-beads/src/services/3d/modelVoxelizeService.ts`

#### 算法演进历程

| 版本 | 方法 | Duck.glb 体素数 | 问题 |
|------|------|-----------------|------|
| v1 | Y主射线 + X/Z补充配对 | 5952 | 脖子粗、头不圆 |
| v2 | 6方向 + maxPairSpan | 5110 | 还是类似问题 |
| v3 | 配对 + 法线一致性检查 | 1674 | 形状好但有空洞 |
| v4 | **表面标记 + 洪水填充** | **9599** | **实心、形状正确** |

#### 根本问题

Duck.glb 是非封闭(non-watertight)网格：
- Y方向 47-55% 射线只有1次交叉（应为偶数次）
- X方向 57-67%，Z方向 58-65%
- 配对法（1st=ENTER, 2nd=EXIT）在此条件下天然不可靠
- 法线分类也不可靠（Duck 面法线多为水平方向，Y射线的 dot product 值都很小且同号）

#### 最终方案 — 表面标记 + 洪水填充

**核心思路**：不依赖配对/法线判断内外，而是：
1. 6方向射线**仅标记表面体素**（每个 hit 点标记对应体素）
2. 从网格边界做 **BFS 洪水填充**标记所有"外部"体素
3. 既非表面也非外部的体素 = **内部** = 填充

**优势**：
- 不需要配对逻辑、法线判断
- 即使 55% 射线只有单次交叉，6方向合力仍能构建完整表面壳
- 洪水填充天然正确地区分内外
- 结果是实心模型，适合后续切片

#### 核心代码结构

```
markSurfaceAlongAxis()   — 6方向射线扫描，每个hit标记为表面体素
floodFillOutside()       — BFS从网格6个面向内扩散，标记"外部"
findNearestSurfaceColor() — 内部体素用最近表面体素的颜色
voxelizeModel()          — 三阶段主流程
```

#### 关键设计

1. **+2 边距填充**：网格每边增加 1 体素的空白边距，确保洪水填充能从边界开始
2. **paddedBox**：扩展包围盒以容纳边距体素
3. **BFS 性能优化**：用 `number[]` 数组模拟队列（每3个元素为 x,y,z），避免 `shift()` 性能问题
4. **颜色传播**：内部体素沿 ±Y、±X、±Z 6个方向搜索最近的表面体素颜色

#### 诊断日志

```
Phase 1: 表面体素 2210
Phase 2: 外部 16513, 表面 2210, 潜在内部 7389
Phase 3: 内部填充 7389, 总体素 9599
多段列: 166 / 816（大幅降低，形状连贯）
```

## 页面布局（修改后）

```
[模型预览 - 原始GLB]     ← 已有
[体素化结果 - 统计数据]   ← 已有
[3D体素预览]             ← 新增！
[切片结果]               ← 已有
```

### Phase 3: 切片验证 — 逐层叠加3D预览

#### 十字插片验证

**新建文件**: `perler-beads/src/components/3d/StackedSliceViewer.tsx`

- 将十字切片（SlicePiece[]）按正确的3D位置渲染
- X切片渲染为YZ平面薄板，Z切片渲染为XY平面薄板
- 使用 InstancedMesh 按颜色分组，支持半透明效果

**验证结论**: 十字插片只产生骨架（6个薄片交叉），不是用户期望的实心模型。
→ 用户真正需要的是 CT 扫描式逐层切片（等高线镂空模式）

#### 等高线切片验证

**新建文件**: `perler-beads/src/components/3d/StackedLayerViewer.tsx`

- 将等高线切片（ContourSlice[]）按 layerIndex 叠加为3D方块
- 坐标映射：pixels[row][col] → (col, layerIndex, row) = (X, Y, Z)
- 使用 InstancedMesh 按颜色分组渲染
- 与 VoxelViewer 放在同一页面，直观对比

**修改文件**: `perler-beads/src/pages/mobile/3d/ModelTo3DPage.tsx`

- 集成 StackedSliceViewer（十字插片叠加预览）
- 集成 StackedLayerViewer（等高线逐层叠加预览）

## 页面布局（最终）

```
[模型预览 - 原始GLB]     ← 已有
[体素化结果 - 统计数据]   ← 已有
[3D体素预览]             ← Phase 1 新增
[逐层叠加预览]           ← Phase 3 新增！
[等高线切片结果]          ← 已有
```

## 验证结果

### Phase 1+2 验证
1. Duck.glb → 体素化 → 3D预览显示完整实心鸭子形状
2. 头部圆润、脖子比例正常、身体无空洞
3. 与原始模型对比形状高度吻合
4. 多段列比例从 47% 降至 20%，形状连贯性大幅提升

### Phase 3 验证
1. Duck.glb → 分辨率16 → 等高线镂空模式 → 15层切片
2. AI推荐: 糖葫芦串连接，置信度85%
3. 逐层叠加3D预览 vs 3D体素预览 → **形状高度一致**
4. 验证结论：等高线切片流程正确地保留了模型形状
5. 统计：15层，1071层珠子 + 45插条珠子 = 1116总珠子
