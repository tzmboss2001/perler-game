# 2026-05-22 单板制作拖动画面抖动修复

## 问题

真机录屏显示：单板制作模式下，放大后用手滑动画布时，图案与网格/高亮覆盖层存在可见抖动，滑动幅度越大越明显。

## 根因

底图所在的 `canvasStage` 会在拖动中立即写入 CSS transform；网格、高亮、色号文字等屏幕空间覆盖层依赖 React 状态同步后重绘，快速拖动时会短暂落后一帧。

上一轮为保证网格线清晰，把网格/高亮从随底图缩放的 stage 内移到了全屏高清覆盖层。这能解决网格随放大变粗、变糊的问题，但需要额外保证覆盖层在拖动中的实时跟随。

## 修改

- 新增屏幕空间覆盖层视觉状态计算：`getScreenSpaceOverlayVisualState`。
- 新增覆盖层过渡 transform 计算：`getScreenSpaceOverlayTransitionTransform`。
- 新增 CSS matrix 格式化 helper：`formatScreenSpaceOverlayTransform`。
- 在拖动/缩放提交时，给覆盖层 canvas 同帧应用临时 transform，使网格、高亮和底图保持同步。
- 覆盖层完成高清重绘后清除临时 transform，继续保持 1px 级别的清晰线条。

## 影响范围

- 仅影响制作模式画布拖动时的覆盖层同步。
- 不改变手势优先级。
- 不改变切板模型。
- 不改变拖动边界和复位逻辑。
- 不改变高亮、色号文字层、网格线、底图的坐标来源。
- 不影响自动跳下一板和分板导出。

## 验证

- `node --test TEST\single_board_interaction.test.mjs`

新增契约覆盖：

- 覆盖层视觉状态必须使用实时 stage display scale。
- 覆盖层在 React 重绘前必须能按拖动位移同帧跟随。

## 回滚

回滚本文件及以下文件中的相关改动：

- `perler-beads/src/utils/singleBoardInteraction.js`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `TEST/single_board_interaction.test.mjs`
