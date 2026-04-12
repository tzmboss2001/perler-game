# 2026-04-11 缩放时预览偏移时序修复

## 问题
制作模式缩放过程中，预览图会出现瞬时偏移。根因不是单纯高亮层错位，而是 `renderScale` 的更新与 stage 变换不在同一拍执行：stage 在 `useLayoutEffect` 中立即应用 transform，但 `renderScaleRef` 之前在普通 `useEffect` 中更新，导致缩放开始时先用旧的 renderScale 算出一帧错误的 displayScale。

## 修复
1. 取消 `renderScaleRef` 的异步 `useEffect` 更新。
2. 将 `renderScaleRef.current = renderScale` 合并进同一个 `useLayoutEffect`。
3. `applyStageTransformStyle` 支持传入 `renderScaleOverride`，确保当前帧使用最新 renderScale 计算 stage transform。

## 结果
缩放开始时，stage 的 transform 与当前 renderScale 同步，减少预览图瞬时偏移。
