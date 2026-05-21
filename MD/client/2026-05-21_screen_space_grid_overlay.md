# 制作页屏幕空间网格覆盖层修复

## 问题

电脑端制作模式中，图案放大后网格线会跟着变粗、变浅、变模糊，视觉上像被放大的像素边缘。

## 根因

原网格覆盖层 `overlayCanvas` 放在 `canvasStage` 内部。`canvasStage` 会随用户缩放执行 CSS transform，因此网格作为位图被浏览器二次缩放。即使线宽做反向缩放，非整数倍 transform 仍会导致线条发糊和宽窄不稳定。

## 修改

- `perler-beads/src/pages/mobile/MakingPage.tsx`
  - 将 `overlayCanvasRef` 从 `canvasStage` 内移到 `canvasStage` 外，与色号文字层一样覆盖在可视窗口上。
  - 覆盖层 backing store 改用 wrapper 可视宽高，而不是图案安全渲染宽高。
  - 网格、小格线、5x5/10x10 辅助线、豆板边界、中心十字、板号、选中区块和色号高亮统一用屏幕坐标绘制。
  - 网格线宽改为最终屏幕像素宽度，不再随图案缩放放大。
  - 保留底图 Canvas 的 pixelated 缩放，避免影响图案像素风格。

- `TEST/adaptive_grid_visual_contract.test.mjs`
  - 增加 contract test，确保交互网格覆盖层位于缩放舞台外。
  - 增加 contract test，确保网格覆盖层使用 viewport backing store。

## 验证

- `cmd /c node --test TEST\adaptive_grid_visual_contract.test.mjs`
- `cmd /c node --test TEST\adaptive_grid.test.mjs`
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
- `cmd /c npm run build`

以上命令通过；build 保留既有 chunk size warning。

## 影响范围

- 仅影响制作页交互 Canvas 覆盖层的绘制坐标与层级。
- 不改变后端、接口、数据结构、导出图纸生成逻辑。
- 不改变底图缩放、拖动、复位、切板模型。

## 回滚

未提交前可执行：

```powershell
git restore perler-beads/src/pages/mobile/MakingPage.tsx TEST/adaptive_grid_visual_contract.test.mjs
Remove-Item MD\client\2026-05-21_screen_space_grid_overlay.md
```

已提交后使用：

```powershell
git revert <commit-id>
```
