# 背景处理模式底部主按钮强制悬浮修复

## 问题
- 背景处理模式中 `回退一步 / 确定 / 一键去背景` 虽然已经渲染，但在当前 768x703 视口下仍被页面底部导航区域吃掉，用户视觉上看不到。

## 修复
1. 将 `bgModeActions` 从 `sticky` 改为真正的 `fixed`：
   - `left: 0`
   - `right: 0`
   - `bottom: calc(56px + env(safe-area-inset-bottom, 0px))`
2. 将 `z-index` 提到更高，保证底部主按钮始终浮在背景处理模式页面最上层。
3. 给 `bgModeOverlay` 补底部内边距，避免悬浮按钮压住预览和缩放区。

## 验证
- `cmd /c npm run build`
- MCP 验证：
  1. 底部三个按钮进入可视区
  2. 不再被底部导航遮挡
