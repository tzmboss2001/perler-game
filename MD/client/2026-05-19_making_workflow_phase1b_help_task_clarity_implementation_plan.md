# Phase1-B 任务理解最小增强实现计划

## 目标

在不破坏手机端单板沉浸式交互基线的前提下，最小实现：

- 当前任务轻提示。
- 状态变化短提示。
- help opener 一致性契约。

## 硬性边界

- overlay-only。
- 不新增大 UI。
- 不改手势模型。
- 不改 layout 占高。
- 不改缩放、拖动边界、复位逻辑。
- 不影响桌面端、传统模式、多板非沉浸式。

## 文件范围

允许修改：

- `perler-beads/src/utils/singleBoardInteraction.js`
- `TEST/single_board_interaction.test.mjs`
- `TEST/mobile_immersive_visual_contract.test.mjs`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `MD/client/*phase1b*.md`

暂不修改：

- 后端 API。
- 色板数据。
- 生成质量代码。
- 导出引擎。
- 发布脚本。
- 模板 / 社区页面。

## Task 1：纯函数与测试

步骤：

1. 在 `TEST/single_board_interaction.test.mjs` 先新增失败测试。
2. 覆盖 `getSingleBoardTaskPrompt`：
   - 非手机端单板沉浸式返回 `visible=false`。
   - 已完成当前板且存在下一板，提示继续下一板。
   - 已选中格子时提示坐标和色号。
   - 已选中颜色时提示当前色剩余数量。
   - 无选择时提示先按颜色制作本板。
3. 覆盖 `getSingleBoardTransientToast`：
   - `color-completed`、`board-completed`、`board-switched`、`view-reset` 输出短提示。
   - freeze hint 或 blocking overlay 打开时返回 `visible=false`。
   - 默认持续时间保持短暂，不超过 1800ms。
4. 运行测试确认 RED。
5. 在 `singleBoardInteraction.js` 做最小实现。
6. 运行测试确认 GREEN。

## Task 2：最小 UI 接入与契约测试

步骤：

1. 在 `TEST/mobile_immersive_visual_contract.test.mjs` 先新增失败测试。
2. 验证：
   - `MakingPage.tsx` 调用 `getSingleBoardTaskPrompt`。
   - `MakingPage.tsx` 调用 `getSingleBoardTransientToast`。
   - 任务提示使用现有 mobile immersive status / overlay 层，不新增 layout 占高容器。
   - freeze hint 优先于 task prompt / transient toast。
   - help opener 仍保持一个 `handleOpenSingleBoardHelp`。
3. 运行契约测试确认 RED。
4. 在 `MakingPage.tsx` 做最小接入：
   - 当前任务提示复用顶部边缘轻提示层。
   - 短提示只通过 `pointer-events: none` 的边缘 overlay 显示。
   - blocking overlay 打开时不显示任务提示和短提示。
5. 运行契约测试确认 GREEN。

## Task 3：验证、记录、提交

步骤：

1. 运行：

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
cmd /c npm.cmd run build
```

2. MCP 手机视口验证：
   - 单板模式 100% 查看任务提示。
   - 工具抽屉打开时 freeze hint 优先。
   - 设置抽屉打开时 freeze hint 优先。
   - 帮助打开 / 关闭后冻结与恢复。
   - 桌面端和传统模式不出现手机任务提示污染。
3. 补充 Phase1-B 实现记录 MD。
4. 提交并推送。

## Stop Condition

出现以下情况立即停止：

- 新增 UI 参与 layout 占高。
- 图纸区域被新提示长期遮挡。
- freeze hint、task prompt、transient toast 三者叠加。
- 关闭 overlay 后画布仍冻结。
- 100% 到 200% 微移失效。
- 300%+ 自由拖动失效。
- 桌面端或传统模式出现手机提示污染。
