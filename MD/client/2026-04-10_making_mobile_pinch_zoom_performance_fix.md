# 2026-04-10 制作模式双指缩放卡顿优化

## 问题
手机端在制作模式中使用双指放大缩小时，明显卡顿。根因不是单一的绘制速度，而是触摸事件频率直接驱动 React 状态更新：
- `touchmove` / 拖动中每次事件都 `setScale`、`setTranslateX`、`setTranslateY`
- React 重渲染频率被强行绑定到手势事件频率
- 底图和高亮层虽然同处一个 stage，但状态更新过密，仍会带来缩放卡顿

## 本次修改
文件：`perler-beads/src/pages/mobile/MakingPage.tsx`

1. 新增 `canvasStageRef`
- 直接拿到统一舞台容器 DOM，手势过程中优先直接更新 `transform`

2. 新增 `renderScaleRef`
- 避免手势过程中反复依赖 React 计算结果，直接用 ref 参与当前帧的 stage 缩放计算

3. 新增 `viewportSyncFrameRef`
- 使用 `requestAnimationFrame` 合帧同步缩放和平移状态
- 不再在每个触摸移动事件里直接触发多次 React 状态更新

4. 新增 `applyStageTransformStyle`
- 手势过程中直接把 `translate + scale` 写到 stage DOM
- 让视觉响应先跟手

5. 重写 `commitTranslate`
- 统一负责：
  - clamp 位移
  - 更新 refs
  - 立即刷新 stage transform
  - 按帧同步 React state
- 支持 `immediate` 模式，供初始化和适板这类一次性动作使用

6. 重写 `applyScaleAtPoint`
- 缩放时不再先 `setScale` 再追平移
- 统一走 `commitTranslate`

7. 初始化、单板适配、适板按钮改为立即同步
- `initial fit`
- `singleBoard fit`
- `handleFitScreen`
都改成 `commitTranslate(..., { immediate: true })`

8. `touchmove` 双指缩放改为合帧更新
- 不再每次事件直接 `setScale`
- 改成由 `commitTranslate` 统一合帧

9. 加入 `useLayoutEffect`
- 当 `scale / translate / renderScale` 最终同步进 React 后，再把 stage transform 校准一次
- 避免状态与 DOM transform 产生长期偏差

## 预期效果
- 双指缩放时，视觉上由 stage 直接跟手
- React 状态更新频率被压到每帧一次，而不是每个 touchmove 一次
- 手机端 pinch 卡顿会明显减轻

## 验证
- `cmd /c npm run build` 通过
