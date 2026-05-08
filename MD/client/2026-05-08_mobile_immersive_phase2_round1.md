# 手机端单板沉浸式 Phase2 第一轮体验优化记录

## 范围

- 浮层视觉层级。
- 状态提示视觉。
- 基础动画过渡。

## 已完成

- 新增手机端单板沉浸式浮层层级 token，避免继续散落 z-index 数字。
- 新增 `mobile-immersive-making.css`，所有样式限定在 `[data-making-page][data-mobile-single-board-immersive="1"]` 下。
- 增加视觉契约测试，阻止 Phase2 CSS 引入 `position`、尺寸、padding、margin 等 layout 占高属性。
- 状态提示保持顶边/边缘提示，降低透明度和阴影权重，不再强化中心遮挡。
- 工具、缩放、总览等浮层增加基础 `opacity`、`transform` 过渡，并支持 `prefers-reduced-motion`。
- 修复状态提示 `border` 与 `borderColor` 混用导致的 React 样式警告。

## 未改动

- 手势阈值。
- 切板模型。
- 拖动边界。
- 工具冻结逻辑。
- layout 占高关系。
- 横屏沉浸式。
- 多板沉浸式。
- FAB 拖动/持久化。
- 高级辅助交互。

## 验证

- `cmd /c node --test TEST\single_board_interaction.test.mjs`：47/47 通过。
- `cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs`：6/6 通过。
- `cmd /c npm.cmd run build`：通过。
- MCP 手机视口 `390x844` 检查：
  - `data-mobile-single-board-immersive="1"` 正常存在。
  - 图纸容器 top 为标题栏底部，bottom 到达视口底部，未被浮层撑开。
  - 浮动缩放层 `z-index: 32`，`pointer-events: none` 外壳保持不抢手势。
  - 工具层 `z-index: 36`，仍为 `position: absolute` 覆盖层。
  - 状态提示层 `z-index: 31`，`pointer-events: none`，位于顶边。
  - 总览卡片为覆盖层，父层 `z-index: 60`。
  - 工具抽屉打开后，模拟底层拖动时 stage transform 不变，冻结逻辑有效。
  - React 样式警告已清除。

## 备注

本地 MCP 控制台仍可看到 `myColorsService` 云端同步 HTTP 500，这是本地测试环境接口返回问题，不属于本次手机端沉浸式视觉改动；本次新增的 React 样式警告已修复。

## 回滚边界

本轮按以下提交拆分，若出现回归，应优先回滚对应单项提交，不回退 Phase1 稳定交互基线：

- `style: define mobile immersive overlay hierarchy`
- `style: refine mobile immersive status hints`
- `style: add mobile immersive base transitions`
- `fix: avoid mobile immersive status border warning`
