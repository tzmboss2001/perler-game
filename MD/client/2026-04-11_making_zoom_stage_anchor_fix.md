# 2026-04-11 制作模式缩放舞台定位固定修复

## 问题
制作模式缩放时，预览图仍会跳动。用户只是放大缩小，不应触发画面位置的重新计算。

## 根因
虽然前面已经把交互缩放和内部安全渲染重建做了解耦，但 `canvasStage` 仍然依赖 wrapper 的居中布局。只要内部安全渲染尺寸 `safeRenderCanvasWidth/Height` 在缩放后发生变化，wrapper 的居中机制就会重新摆位 stage，导致画面出现整体跳动。

## 修复
1. 将 `canvasStage` 从相对定位改为绝对定位。
2. 为 `canvasStage` 固定 `left: 50%`、`top: 50%`，建立稳定中心锚点。
3. 将 stage transform 统一改为：
   - `translate(-50%, -50%)`
   - `translate(x, y)`
   - `scale(displayScale)`
4. `applyStageTransformStyle` 与初始 `canvasStageStyle` 使用同一套 transform 公式。

## 结果
缩放只改变舞台倍率和用户显式平移，不再因为内部安全渲染尺寸变化触发整张图重新摆位，从而消除缩放时的不规则乱跳。
