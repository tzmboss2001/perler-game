# 2026-05-15 单板模式移动端工具栏 2x2 布局优化

## 背景

单板制作模式移动端右下角 4 个功能按钮原本使用 `flexWrap` 自动换行，在约 186px 宽度的容器内形成“上排 3 个、下排 1 个”的布局。第二行右侧留白明显，空间利用率差。

## 修改内容

- 修改 `perler-beads/src/pages/mobile/MakingPage.tsx`
  - `singleBoardMobileNavRow` 从 `flex + wrap` 改为 `grid`。
  - 使用 `gridTemplateColumns: repeat(2, minmax(0, 1fr))` 固定为两列。
  - 新增 `singleBoardMobileNavRowFill`，让 `总览 / 复位 / 完成 / 工具` 四个按钮等宽填满各自格子。

## 新增测试

- `TEST/single_board_mobile_toolbar_layout_contract.test.mjs`
  - 验证移动端单板工具栏主按钮行使用 2 列 grid。
  - 验证按钮使用填满单元格的共享样式。
  - 验证该样式块不再使用 `flexWrap: "wrap"`。

## 验证结果

- `cmd /c node --test TEST\single_board_mobile_toolbar_layout_contract.test.mjs`：通过。
- `cmd /c node --test TEST\single_board_interaction.test.mjs`：52 项通过。
- `cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_clean --emptyOutDir`：通过，仅有既有 chunk size 警告。
- Chrome DevTools 移动端 390x844 视口 DOM 坐标验证：
  - `总览 / 复位`：第一行，等宽。
  - `完成 / 工具`：第二行，等宽。
  - 父容器 display 为 `grid`，两列宽度一致。

## 注意事项

- 本次只改移动端单板工具栏布局。
- 不影响画布、高亮、分板导出、换色、自动切下一板、完成状态和后端接口。
- 本地 DevTools 控制台存在 `myColorsService` 云端同步 500，属于既有接口/登录态相关问题，不由本次布局改动引入。

## 回滚方式

如需回滚：

- 将 `singleBoardMobileNavRow` 改回 `display: "flex"`、`flexWrap: "wrap"`。
- 移除 `singleBoardMobileNavRowFill`。
- 移除四个按钮上的 `styles.singleBoardMobileNavRowFill`。
- 删除 `TEST/single_board_mobile_toolbar_layout_contract.test.mjs`。
