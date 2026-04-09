# 2026-04-07 单板模式颜色高亮修复后的黑屏回归修复

## 问题
- 在增强单板模式颜色高亮可视性后，制作模式出现黑屏。
- MCP 控制台确认运行时错误为 `highlightedIndices is not defined`。

## 根因
- 在覆盖层 overlay canvas 的渲染 effect 中使用了 `highlightedIndices`，但没有在该作用域内重新定义。
- 导致 MakingPage 运行时报错，页面正文渲染失败，看起来像黑屏。

## 修复
- 在 overlay 渲染 effect 中补上 `highlightedIndices` 集合定义。
- 与底图渲染层保持一致，按当前区块与颜色计算同色索引集合。

## 修改文件
- `perler-beads/src/pages/mobile/MakingPage.tsx`

## 验证
- `cmd /c npm run build`
- MCP 控制台复查 `highlightedIndices is not defined` 错误消失
