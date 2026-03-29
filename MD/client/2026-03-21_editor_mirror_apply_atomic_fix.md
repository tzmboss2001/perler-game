# 编辑页镜像操作即时生效修复

- 时间：2026-03-21
- 归属：客户端
- 文件：`perler-beads/src/pages/mobile/EditorPage.tsx`、`perler-beads/src/store/editorStore.ts`

## 问题
用户点击编辑页“镜像 / 翻转”里的“左右镜像”后，图像没有明显变化，表现为镜像操作像是没有生效。

## 原因
1. 镜像逻辑先调用 `setBeadData()`，再单独调用 `saveToHistory()`，数据更新和历史写入不是原子操作。
2. `saveToHistory()` 依赖 store 当前状态，容易记录到旧图案，导致镜像后的可视结果和撤销历史不同步。
3. 镜像完成后预览区没有重新适配视口，局部查看状态下用户更容易误以为图像没有变化。

## 修复
1. 在 `editorStore` 中新增 `applyBeadDataChange()`，统一完成：
   - 更新当前 `beadData`
   - 写入新的历史快照
   - 推进 `historyIndex`
2. 编辑页镜像逻辑改为调用 `applyBeadDataChange()`，不再拆开执行 `setBeadData()` 和 `saveToHistory()`。
3. 镜像完成后调用 `interactiveCanvasRef.current?.fitToViewport()`，让预览重新适配，确保变化立即可见。

## 结果
- 点击“左右镜像”后，图案会立即切换到镜像结果。
- 撤销/重做历史与当前图案保持一致。
- 预览会重新适配，用户能直接看到镜像后的变化。
