# 2026-03-16 编辑页背景处理回退前进无效修复

## 问题
- 背景处理模式里点击“回退”或“前进”没有反应。

## 根因
- `editorStore` 里的 `setBeadData()` 每次都会重置历史为一条最新状态。
- 背景处理、换色、合并等编辑操作也在用 `setBeadData()`。
- 结果是每次修改后历史都会被清空，`undo/redo` 看起来存在，但实际上没有可回退的记录。

## 修复
- 在 `editorStore.ts` 中新增 `initializeBeadData()`，仅用于首次载入或整图重置时初始化历史。
- `setBeadData()` 改为仅更新当前数据，不再重置历史。
- `EditorPage.tsx` 中：
  - 图片首次生成使用 `initializeBeadData()`。
  - 全部还原使用 `initializeBeadData()`。
  - 智能合并改为先 `setBeadData()` 再 `saveToHistory()`，不再传无效参数。

## 影响
- 背景处理模式下的回退/前进现在会真正生效。
- 其它编辑操作的历史记录也恢复正常。
