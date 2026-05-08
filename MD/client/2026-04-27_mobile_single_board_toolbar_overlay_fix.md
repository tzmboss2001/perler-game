# 2026-04-27 手机端单板制作工具条遮挡图纸修复

## 问题
- 真机反馈：手机端单板制作模式下，顶部四按钮条会遮挡部分图纸。
- 追加要求：按钮条不能挡住制作图纸，同时希望保留核心功能，并在用户开始操作图纸后把工具条收薄。

## 本次改动
- 在 `perler-beads/src/utils/singleBoardInteraction.js` 新增并接入手机端单板工具条状态与顶部避让相关 helper。
- 在 `perler-beads/src/pages/mobile/MakingPage.tsx` 改为按真实 mobile chrome 高度动态计算画布避让，不再使用固定 `top` 偏移。
- 手机端单板模式顶部工具区改成更薄的半浮动工具条：
  - 默认展开，显示 `总览 / 复位 / 完成 / 收起`。
  - `自动切换 / 图纸 / 辅助` 收进展开态工具区。
  - 用户点击图纸后，工具条自动收薄为 `总览 / 复位 / 完成 / 工具`。
- 去掉手机端底部控制区里与顶部工具条重复的按钮，避免出现两套移动端单板按钮。
- 修正 cherry-pick 后带出的运行时问题：
  - `singleBoardMobileToolbarExpanded is not defined`
  - `Cannot access 'singleBoardAllDone' before initialization`

## 验证
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
  - 39/39 通过
- `cmd /c npm.cmd run build`
  - 通过
- MCP 本地页面验证：
  - 页面：`http://127.0.0.1:3008/mobile/making`
  - 视口：`390 x 844`
  - 初始可见按钮：`总览 / 复位 / 完成 / 收起`
  - 点击图纸后自动收薄为：`总览 / 复位 / 完成 / 工具`
  - 画布未再被整条按钮栏遮挡
  - 运行时 `ReferenceError` 已消失

## 产物
- 截图：
  - `TEMP/mobile_toolbar_overlay_fix_local_after_reload.png`
  - `TEMP/mobile_toolbar_overlay_fix_collapsed.png`
- 设计：
  - `docs/superpowers/specs/2026-04-27-mobile-single-board-toolbar-overlay-design.md`
- 计划：
  - `docs/superpowers/plans/2026-04-27-mobile-single-board-toolbar-overlay-fix.md`

## 2026-05-06 追加修正：工作区高度未充分利用
- 真机反馈：单板模式下，图纸工作区域约一半高度未显示图纸。
- 根因：`canvasWrapper` 位于 `canvasContainer` 内部，而 `canvasContainer` 本身已经排在顶部工具条和缩放条下方；上一轮把完整页面顶部 chrome 高度再次作为 `canvasWrapper.top`，导致顶部高度被重复避让。
- 修正：
  - 新增 `getSingleBoardCanvasWrapperTopOffset`。
  - 手机端单板模式下，`canvasWrapper.top` 只保留容器内本地避让值 `46px`，不再叠加模式切换、摘要、工具条等页面外部高度。
- 验证：
  - 修复前 MCP 实测：`canvasWrapper.topStyle = 173px`，画布容器从 `y=356.3` 才开始。
  - 修复后 MCP 实测：`canvasWrapper.topStyle = 46px`，画布容器从 `y=233.3` 开始。
  - `cmd /c node --test TEST\single_board_interaction.test.mjs`：40/40 通过。
  - `cmd /c npm.cmd run build`：通过。
  - 截图：`TEMP/mobile_single_board_workarea_after_top_fix.png`。
