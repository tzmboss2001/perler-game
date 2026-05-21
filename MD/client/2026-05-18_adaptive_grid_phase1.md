# 2026-05-18 Adaptive Grid Phase1

## 背景

制作模式已有基础小格线、现实豆板 10x10 分区线、5x5 辅助虚线和当前板边界。用户确认第一版 adaptive grid 方向：默认轻网格保持不变，新增可选“网格增强”模式，使用区域级亮度判断、双层半透明线条，并优先增强当前板和视口中心区域。

## 修改内容

- 新增 `perler-beads/src/utils/adaptiveGrid.js`，提供区域亮度分桶、双层半透明网格样式、缩放 hysteresis、当前工作区域增强判断。
- 制作页新增“网格增强”开关，默认关闭。
- 增强模式只叠加在当前板和视口中心工作区域，外围继续保持轻网格。
- 保持色号文字、当前点击格、当前色号高亮、当前板边界高于网格增强层。
- 默认模式和图纸导出暂不改变。
- 修复网格增强开关复用 toggle active 样式时触发的 React `border` / `borderColor` 冲突警告。

## 验证记录

已运行：

```powershell
cmd /c node --test TEST\adaptive_grid.test.mjs
cmd /c node --test TEST\adaptive_grid_visual_contract.test.mjs
cmd /c node --test TEST\single_board_interaction.test.mjs
```

待完整验收：

```powershell
cmd /c node --test TEST\physical_board_guides.test.mjs
cmd /c node --test TEST\physical_board_guides_visual_contract.test.mjs
cmd /c node --test TEST\export_modal_visual_contract.test.mjs
cmd /c node --test TEST\zip_export.test.mjs
cmd /c npm run build -- --outDir ..\TEMP\adaptive_grid_phase1_build --emptyOutDir
```

## 影响范围

- 只影响制作页视觉 overlay 的可选增强模式。
- 默认模式不变。
- 不影响换色、自动跳下一板、完成状态、分板导出、overview、ZIP 下载格式。

## 回滚方式

- 关闭或移除“网格增强”开关。
- 移除 `adaptiveGrid.js` 和相关调用。
- 恢复 `MakingPage.tsx` 到只使用固定网格样式的路径。
