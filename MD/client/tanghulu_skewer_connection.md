# 糖葫芦串连接 + 智能推荐系统

## 日期: 2026-02-10

## 修改概述
新增"糖葫芦串连接"（Tanghulu Skewer）方式和智能连接推荐系统，扩展现有的蜈蚣骨架连接功能。

## 修改文件

### 1. `perler-beads/src/services/3d/contourSliceService.ts`

**新增接口：**
- `ConnectionType` - 连接策略类型：centipede/tanghulu/hybrid/none/auto
- `ModelAnalysis` - 模型特征分析（层数、面积、重叠率、相似度等）
- `ConnectionRecommendation` - 智能推荐结果（推荐类型+理由+置信度）
- `SkewerSlotInfo` - 糖葫芦串槽信息
- `TanghuluSkewer` - 糖葫芦串插条

**修改接口：**
- `ContourSlice` - 新增 `skewerSlots` 字段
- `ContourSliceConfig` - `enableCentipede` 替换为 `connectionType`
- `ContourSliceResult` - 新增 `skewers`, `recommendation` 字段

**新增算法函数：**
- `findCommonOverlap()` - 计算所有层的公共重叠区域
- `computeDistanceTransform()` - 曼哈顿距离变换，找最安全的插条位置
- `selectSkewerPositions()` - 选择插条放置位置（距边缘最远+分散分布）
- `punchSkewerSlot()` - 在层上挖糖葫芦串槽
- `generateSkewerPiece()` - 生成插条像素数据
- `analyzeModel()` - 分析模型特征
- `recommendConnection()` - 智能推荐连接方式
- `renderSkewerToCanvas()` - 渲染插条图纸（紫色主题）

**重构主流程 `generateContourSlices()`：**
- Phase 1: 生成所有层（镂空）- 保留现有逻辑
- Phase 1.5: 【新增】模型分析 + 智能推荐
- Phase 2b: 【新增】糖葫芦串（先处理，蜈蚣需避开）
- Phase 2a: 蜈蚣连接器（混合模式下避开糖葫芦串位置±2格）
- Phase 3: 重算珠子数

**渲染函数修改：**
- `renderContourSliceToCanvas()` - 新增紫色方框标记糖葫芦串槽位
- 新增 `renderSkewerToCanvas()` - 紫色主题渲染插条
- 新增 `exportSkewerAsImage()` - 导出插条图片

### 2. `perler-beads/src/pages/mobile/3d/ModelTo3DPage.tsx`

**UI 变更：**
- enableCentipede 开关 → 五选一连接方式按钮组（智能推荐/蜈蚣骨架/糖葫芦串/混合模式/无连接）
- 新增 `RecommendationCard` 组件 - AI推荐信息卡片
- 新增 `TanghuluSkewerThumbnail` 组件 - 插条缩略图（紫色主题）
- 新增 `TanghuluSkewerDetailModal` 组件 - 插条详情弹窗

**状态变更：**
- `enableCentipede` → `connectionType: ConnectionType`（默认'auto'）
- 新增 `skewers`, `selectedSkewer`, `recommendation` 状态

**结果展示：**
- 层列表 → 蜈蚣连接器列表 → 糖葫芦串插条列表
- 统计栏：总层数 | 层珠子 | 连接器数 | 插条数 | 总珠子
- 导出同时包含：层图纸 + 蜈蚣图纸 + 插条图纸

## 智能推荐规则

| 优先级 | 条件 | 推荐 | 理由 |
|--------|------|------|------|
| 1 | 层数<=2 | none | 无需连接 |
| 2 | 重叠率>30% + 细长 | tanghulu | 细长模型插条一串到底 |
| 3 | 重叠率>25% + 层数>=8 | tanghulu | 层多重叠充分 |
| 4 | 面积>100 + 相似度>0.7 | centipede | 大面积蜈蚣更稳 |
| 5 | 重叠率<10% | centipede | 重叠不足无法串 |
| 6 | 面积<=50 | tanghulu | 小模型串更简洁 |
| 7 | 默认 | centipede | 通用方案 |

## 两种连接方式对比

| 特征 | 蜈蚣骨架 | 糖葫芦串 |
|------|----------|----------|
| 范围 | 每对相邻层之间 | 贯穿所有层 |
| 结构 | 扁平片+腿 | 竖直插条 |
| 适用 | 大面积、相邻层相似 | 小面积、层数多 |
| 方向 | 交替H/V | 固定方向 |
| 主题色 | 橙色 #FF8C00 | 紫色 #8B5CF6 |
