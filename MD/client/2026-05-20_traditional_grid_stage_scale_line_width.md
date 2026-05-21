# 传统模式高倍缩放网格线宽修复

## 问题

真机传统制作模式下，放大到高倍后网格线出现宽窄不一、半透明发灰、与单板模式清晰网格风格不一致的问题。

## 根因

- 传统模式和单板模式共用大部分 Canvas 覆盖层绘制逻辑，但传统模式更容易在整图状态下放大到 `scale > renderScale`。
- 覆盖层 Canvas 会被舞台 `transform: scale(...)` 二次放大，原来的增强网格线宽没有按最终屏幕像素归一，导致线条被放大后变粗。
- 覆盖层使用 `imageRendering: "pixelated"`，在非整数倍缩放时会让线条呈现 2px/3px 交替的视觉差异。

## 修改

- `perler-beads/src/utils/adaptiveGrid.js`
  - `getAdaptiveGridVisualLayers` 增加 `displayScale` 入参。
  - 增强网格线宽按舞台实时缩放比例反向归一，避免高倍缩放后变粗。

- `perler-beads/src/pages/mobile/MakingPage.tsx`
  - 覆盖层绘制时使用 `getLiveStageDisplayScale` 获取实时舞台缩放。
  - 小格线、5x5/10x10 辅助线、板边界线、选中框线宽按最终屏幕宽度归一。
  - `overlayCanvas` 改为 `imageRendering: "auto"`，避免网格线被 pixelated 放大成宽窄不一。

- `TEST/adaptive_grid.test.mjs`
  - 增加高倍舞台缩放下增强网格线宽归一的 contract test。

- `TEST/adaptive_grid_visual_contract.test.mjs`
  - 增加覆盖层不使用 pixelated 缩放网格的 contract test。

## 验证

- `cmd /c node --test TEST\adaptive_grid.test.mjs`
- `cmd /c node --test TEST\adaptive_grid_visual_contract.test.mjs`
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
- `cmd /c node --test TEST\deploy_frontend_ssh_security.test.mjs`
- `cmd /c npm run build`

以上均通过；build 仅保留既有 chunk size warning。

## 影响范围

- 前端 Canvas 覆盖层视觉表现。
- 传统模式和单板模式都会受益于高倍缩放线宽归一。
- 不改变手势优先级、切板模型、导出逻辑、换色逻辑、自动跳下一板逻辑。

## 回滚

回滚本次涉及的以下文件即可：

- `perler-beads/src/utils/adaptiveGrid.js`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `TEST/adaptive_grid.test.mjs`
- `TEST/adaptive_grid_visual_contract.test.mjs`
- `MD/client/2026-05-20_traditional_grid_stage_scale_line_width.md`
