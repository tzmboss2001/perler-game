# 2026-04-02 制作模式黑屏与高倍率复测修复

## 问题
- 用户反馈进入制作模式直接黑屏。
- 用户反馈在高宽度（240）进入制作模式后，放大预览图会黑屏，导致产品无法使用。
- 真实链路复测时，编辑页还存在 `handleAdjustGridSize is not defined` 运行时错误，会污染保存进入制作模式流程。

## 根因
1. `MakingPage.tsx` 在双尺度渲染改造后，渲染逻辑使用了 `visualCellSize`，但没有从 `getSafeRenderMetrics()` 的返回值中正确解构，触发 `ReferenceError: visualCellSize is not defined`，React 组件直接崩溃，表现为进入制作模式黑屏。
2. 编辑页宽度加减按钮绑定了丢失的 `handleAdjustGridSize`，导致保存进入制作模式的真实链路里会额外产生运行时错误。

## 修改
- 在 `perler-beads/src/pages/mobile/MakingPage.tsx` 中补齐 `visualCellSize` 的返回与解构，恢复制作模式渲染。
- 在 `perler-beads/src/pages/mobile/EditorPage.tsx` 中恢复 `handleAdjustGridSize()`，统一走现有的 `handleRegenerateWithGridSize()`。

## 验证
- 执行 `cmd /c npm run build`，通过。
- MCP 真实链路测试：
  1. 上传图片
  2. 裁剪确认
  3. 编辑页将宽度调到 `240`
  4. 点击“保存并开始制作”进入制作模式
- 结果：制作模式正常进入，没有首屏黑屏。
- MCP 在该 `240` 宽度作品上将制作模式缩放直接拉到 `600%`，页面仍正常渲染，截图中格内色号清晰可见，未出现黑屏。

## 结果
- 制作模式首屏黑屏问题已修复。
- 高宽度 `240` 的真实进入链路已恢复。
- 制作模式高倍率缩放在本次样本上可稳定到 `600%`。
