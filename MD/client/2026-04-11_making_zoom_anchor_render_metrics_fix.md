# 2026-04-11 缩放时预览乱动解耦修复

## 问题
制作模式缩放时，画面会出现不规则偏移。根因是内部安全渲染尺寸 `renderMetrics` 之前直接依赖实时 `scale`，导致用户每次缩放时不仅 stage 在变换，内部 canvas 的安全渲染比例和尺寸也会同步重算，进而引发视觉上的跳动。

## 修复
1. 新增 `renderScaleAnchor`，作为内部安全渲染的锚定倍率。
2. `renderMetrics` 不再直接依赖实时 `scale`，改为依赖 `renderScaleAnchor`。
3. 缩放时先只更新 stage 的视觉缩放。
4. 在缩放停止约 140ms 后，再把 `renderScaleAnchor` 同步到最新 `scale`，触发内部高清重建。
5. 当显示区域本身变化（板块切换、视图区尺寸变化）时，立即重置 `renderScaleAnchor`，避免场景切换后沿用旧锚定值。

## 结果
缩放过程中主要只有 stage 在做视觉变换，内部 canvas 不再每次都跟着重建，减少了预览图在缩放时的不规则乱动。
