# 蜈蚣骨架连接系统 (Centipede Connector)

## 日期: 2026-02-09

## 修改概述

将等高线镂空切片的旧卡榫/凹槽(tab/slot)连接系统替换为全新的"蜈蚣骨架连接"系统。

## 问题背景

旧的卡榫/凹槽连接存在根本缺陷：
- 上下层的 tab/slot 位置独立计算，无法精确对齐
- 凸起/凹槽方案在拼豆中不实用

## 新方案：蜈蚣骨架连接

每对相邻层之间有一个独立的"蜈蚣"连接片（扁平拼豆条）：
- 蜈蚣竖立放置：身体(spine)在层间作骨架
- 腿(legs)上下插入两层的预留孔洞
- 奇偶连接器交替方向（水平/垂直），使中间层的两组孔不冲突

### 蜈蚣连接片结构
```
Row 0:  ■     ■     ■        ← 上排腿（插入上层孔）
Row 1:  ■ ■ ■ ■ ■ ■ ■ ■ ■  ← 身体（脊柱）
Row 2:  ■     ■     ■        ← 下排腿（插入下层孔）
```

## 修改文件

### 1. `src/services/3d/contourSliceService.ts` - 完全重构

**删除的旧接口/函数：**
- `AlignmentPoint` 接口
- `findEdgeMidpoints()` 函数
- `calculateAlignmentCount()` 函数
- `addAlignmentFeatures()` 函数
- `addTabAt()` 函数
- `addSlotAt()` 函数

**新增接口：**
- `HolePosition` - 孔洞位置（蜈蚣腿插入的位置）
- `CentipedeConnector` - 蜈蚣连接片数据
- `ContourSliceResult` - 包含 slices + connectors 的完整结果

**修改接口：**
- `ContourSlice`: `alignmentPoints` → `holes: HolePosition[]`
- `ContourSliceConfig`: `enableAlignment` → `enableCentipede`

**新增算法函数：**
- `findShellCrossings()` - 沿扫描线找轮廓壳交叉区段
- `intersectCrossings()` - 两层交叉区段求交集
- `selectLegPositions()` - 选择腿位置，避冲突
- `computeCommonCenter()` - 计算两层公共包围盒中心
- `findBestScanLine()` - 搜索最佳扫描线
- `generateCentipedePiece()` - 生成蜈蚣连接片像素
- `punchHoles()` - 在层上打孔

**重构主流程 `generateContourSlices()`：**
- 返回类型改为 `ContourSliceResult`
- 三阶段流程：Phase 1 生成层 → Phase 2 生成连接器+打孔 → Phase 3 重算珠子数

**新增渲染函数：**
- `renderCentipedeToCanvas()` - 渲染连接片（灰色脊柱+橙色腿）
- `exportCentipedeAsImage()` - 导出连接片图片

### 2. `src/pages/mobile/3d/ModelTo3DPage.tsx` - UI 适配

**状态变更：**
- `enableAlignment` → `enableCentipede`
- 新增 `connectors` 和 `selectedConnector` 状态

**新增组件：**
- `CentipedeConnectorThumbnail` - 连接器缩略图（橙色主题）
- `CentipedeDetailModal` - 连接器详情弹窗

**UI 变更：**
- 开关文本：「层间卡榫对齐」→「蜈蚣骨架连接」
- 开关颜色：绿色 → 橙色渐变
- 详情弹窗：「卡榫: X个」→「孔洞: X个」
- 结果区域：层列表下方新增连接器列表
- 统计栏：新增连接器数量 + 总珠子数（含连接器）
- 导出：同时导出层图纸和连接器图纸

## 核心算法说明

### 交替方向策略
```
连接器 1-2: horizontal（腿沿 centerRow 排列）
连接器 2-3: vertical  （腿沿 centerCol 排列）
连接器 3-4: horizontal
...交替循环
```

### 腿位置计算
1. 沿扫描线扫描两层的轮廓
2. 找到扫描线与轮廓壳的交叉区段
3. 取两层交叉区段的交集
4. 在每个交叉段的中点放腿，宽段两端也放
5. 冲突检测：跳过已被其他连接器占用的位置

## 验证方法
1. Duck.glb，分辨率32，壳厚度3，启用蜈蚣骨架
2. 检查连接器交替方向（H, V, H, V...）
3. 检查中间层同时有水平孔和垂直孔，不冲突
4. 检查连接片图纸为正确的蜈蚣形状（3行，腿+身体+腿）
5. 检查层图纸上孔洞标记（橙色圆圈+十字）清晰可辨
