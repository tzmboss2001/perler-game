# 2026-04-12 制作模式舞台 transform 单一来源修复

## 问题
制作模式缩放时，画面仍会出现随机跳动。

## 根因
`canvasStage` 的 transform 同时来自两套来源：
1. React 渲染时通过 `canvasStageStyle.transform` 写入。
2. 交互过程中通过 `applyStageTransformStyle` 直接写 DOM style。

这会导致缩放时 stage transform 被 React 的旧状态回写覆盖，再被交互逻辑纠正，形成随机跳动。

## 修复
1. 移除 `canvasStageStyle` 中的 transform。
2. 统一由 `applyStageTransformStyle` 与对应的 `useLayoutEffect` 负责 stage transform。
3. 保留宽高由 React 控制，位移和缩放由单一来源控制。

## 结果
缩放和平移时，舞台 transform 不再被两套来源互相覆盖，减少随机跳动。
