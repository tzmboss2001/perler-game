# 2026-04-02 制作模式高倍率黑屏与极清导出失败修复

## 问题
1. 制作模式在 240 宽度大图下放大预览时可能黑屏。
2. 极清（max）导出在大图下容易卡住或失败，用户感觉“下不下来”。

## 原因
1. 制作模式此前把 canvas 的 CSS 尺寸直接拉到视觉缩放后的超大尺寸，浏览器在多板大图高倍率下会触发合成层/纹理上限，出现黑屏。
2. 导出仍使用 `toDataURL` 同步导出，极清规格下 canvas 尺寸过大时容易卡死或失败。

## 修改
1. 制作模式改成“内部安全尺寸渲染 + 外层 CSS scale 显示缩放”：
   - 内部仍按安全 renderScale 渲染，限制 canvas 实际像素尺寸。
   - 外层通过 `transform: translate(...) scale(...)` 提供视觉高倍率，避免 DOM canvas 尺寸无限膨胀。
2. 新增统一的安全渲染指标计算 `getSafeRenderMetrics()`，在渲染阶段和展示阶段共用。
3. 极清/高清/分页导出改成：
   - 先根据图案尺寸计算安全导出 cellSize。
   - 改用 `canvas.toBlob()` + Blob URL 下载，不再走 `toDataURL()`。

## 结果
1. 制作模式高倍率更不容易因为大图 CSS 尺寸过大而黑屏。
2. 极清导出在大图下会自动降到安全尺寸执行下载，优先保证“能导出下来”。

## 影响文件
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/components/ExportModal.tsx`

## 验证
- `npm run build`
