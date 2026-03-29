# 2026-03-27 编辑页失效状态调用修复

## 问题
- 创建页控制台出现 `setHighlightedColorId is not defined`。
- 根因是编辑页背景处理入口里残留了已删除状态 `setHighlightedColorId` 的调用。

## 修改
- 文件：`perler-beads/src/pages/mobile/EditorPage.tsx`
- 删除 `handleEnterBackgroundMode()` 中失效的 `setHighlightedColorId(null)` 调用。

## 结果
- 消除该前端运行时错误，避免影响后续编辑页与去背景链路测试。
