# Adaptive Grid Phase1 Implementation Plan

## 目标

在制作模式中新增可选的“网格增强”模式，用区域级 adaptive contrast 提升 5x5 辅助线和 10x10 分区线可读性，同时保持默认轻网格不变。

## 分支与隔离

- 分支：`feature/adaptive-grid-phase1`
- worktree：`C:\Users\tzm\.config\superpowers\worktrees\perler-beads-creator\adaptive-grid-phase1`
- 基线分支：`feature/making-workflow-productization-phase1`
- 不在 `main` 上开发
- 不 apply / pop `stash@{0}`
- 不触碰 admin、backend、deploy、`config.yaml`、`__pycache__`

禁止路径：

```text
perler-beads-server/
perler-beads/src/pages/admin/
perler-beads/src/services/api/adminApi.ts
SCRIPT/deploy_frontend_ssh.py
TEST/test_deploy_frontend_ssh.py
**/__pycache__/**
perler-beads-server/server/config.yaml
```

## 实施范围

- 新增 `perler-beads/src/utils/adaptiveGrid.js`
- 新增 `TEST/adaptive_grid.test.mjs`
- 新增 `TEST/adaptive_grid_visual_contract.test.mjs`
- 修改 `perler-beads/src/pages/mobile/MakingPage.tsx`
- 新增 `MD/client/2026-05-18_adaptive_grid_phase1.md`

## 关键设计

1. 默认模式继续走原固定轻网格，不改变原始视觉。
2. 增强模式默认关闭，由用户在设置中手动开启。
3. 亮度判断按 10x10 区域聚合，不做单格级黑白切换。
4. 线条使用浅线 + 深线双层半透明样式，避免纯黑、纯白和脏感。
5. 只增强当前板和当前视口中心区域，其他区域保持轻量。
6. 5x5 辅助线低于 10x10 分区线，当前板边界、当前点击格、当前色号高亮保持最高视觉优先级。
7. `drawCellSize` 阈值使用 hysteresis，减少缩放临界点闪烁。
8. 图纸导出暂不改动，避免影响既有导出格式。

## TDD 任务

- [x] 先写 helper 契约测试，验证区域亮度、双层线样式、hysteresis、当前工作区域 boost。
- [x] 运行 helper 测试红灯，确认缺少 `adaptiveGrid.js`。
- [x] 实现 `adaptiveGrid.js`，让 helper 测试转绿。
- [x] 先写页面源代码契约测试，验证开关、helper 引用、默认网格保留、增强层绘制顺序。
- [x] 运行页面契约测试红灯，确认 `MakingPage.tsx` 尚未接入。
- [x] 接入 `MakingPage.tsx` 的开关、缓存、hysteresis 和 overlay 绘制。
- [x] 运行页面契约和单板交互回归测试。
- [ ] 运行完整测试集合和 build。
- [ ] 执行 MCP 视觉验收。

## 验证命令

```powershell
cmd /c node --test TEST\adaptive_grid.test.mjs
cmd /c node --test TEST\adaptive_grid_visual_contract.test.mjs
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\physical_board_guides.test.mjs
cmd /c node --test TEST\physical_board_guides_visual_contract.test.mjs
cmd /c node --test TEST\export_modal_visual_contract.test.mjs
cmd /c node --test TEST\zip_export.test.mjs
cmd /c npm run build -- --outDir ..\TEMP\adaptive_grid_phase1_build --emptyOutDir
```

## MCP 验收矩阵

- 默认模式适配、普通放大、高倍率放大截图。
- 增强模式适配、普通放大、高倍率放大截图。
- 浅色区域和深色区域对比度检查。
- 选中色号高亮开启时，网格不得抢视觉焦点。
- 当前板边界仍强于 adaptive 辅助线。
- 缩放阈值附近不出现明显闪烁。

## 回滚方式

1. 最小回滚：保持代码但默认关闭“网格增强”。
2. 功能回滚：移除 `MakingPage.tsx` 中的开关、helper 引用和 `drawAdaptiveGridEnhancement` 调用。
3. 完整回滚：删除 `adaptiveGrid.js`、adaptive grid 测试和本次文档提交。
