# 2026-05-19 单板沉浸工具入口优化

## 背景

用户从“我的方案”进入制作页时会直接进入单板沉浸式制作界面。该界面隐藏了顶部“传统模式 / 单板模式”切换条，并且“网格增强”原本需要通过“工具 -> 辅助 -> 设置面板”才能找到，导致用户误以为传统模式不可用、单板模式不能启用网格增强。

## 修改内容

- 在单板沉浸式工具展开后的第一层新增“整图”按钮。
  - 点击后调用 `handleOpenTraditionalOverview`。
  - 切换到传统整图视图并执行适屏。
- 在同一层新增“网格”按钮。
  - 直接切换 `gridEnhanceEnabled`。
  - 单板模式和传统模式都可以启用网格增强。
- 修复单板工具激活态样式里的 `border` / `borderColor` 混用，避免 React 样式警告。

## 验证

已运行：

```powershell
cmd /c node --test TEST\adaptive_grid_visual_contract.test.mjs
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\adaptive_grid.test.mjs
```

## 影响范围

- 只影响手机端单板沉浸式工具展开后的入口可发现性。
- 不改变默认进入单板模式的逻辑。
- 不改变分板模型、自动跳下一板、换色、导出、当前格高亮。
- 网格增强仍默认关闭，但现在单板模式可以在第一层工具里直接打开。

## 回滚方式

- 删除单板沉浸式工具行里的“整图”和“网格”按钮。
- 恢复 `singleBoardMobileToolToggleBtnActive` / `singleBoardMobileToolChipActive` 的原样式。
- 保留深层设置面板中的“网格增强”开关即可恢复原入口逻辑。
