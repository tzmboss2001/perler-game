# 2026-03-12 视觉辅助引导补充“下一步建议”和“优先修正”

## 目标
把制作页视觉辅助从“只显示进度数字”提升到“告诉用户下一步放哪一格、哪一格放错了应该改成什么颜色”，更接近傻瓜式拼豆引导。

## 本次修改
1. 扩展 `visionAssistService.ts`
- 为 `VisionDetectedCell` 增加 `detectedColor`、`detectedDistance`
- 为 `VisionDetectionResult` 增加 `wrongCellsDetail`
- 在识别阶段为错放格计算最接近的板内目标色，便于给出“当前更像什么颜色”的提示

2. 更新 `BoardVisionAssistModal.tsx`
- 新增“下一步建议”卡片
- 新增“优先修正”卡片
- 显示板内坐标、全图坐标、目标颜色、当前更像的颜色
- 将颜色名称显示收敛到统一的 `getColorLabel()`

## 验证
1. 本地构建
- `npm run build` 通过

2. MCP 逻辑验证
- 在浏览器内动态导入 `visionAssistService.ts`
- 构造 2x2 合成画面并调用 `analyzeVisionProgress`
- 返回结果正确识别：
  - `matchedCells = 2`
  - `missingCells = 1`
  - `wrongCells = 1`
  - `nextGuideCell = { x: 1, y: 0, target: 'A' }`
  - `wrongDetail = [{ x: 1, y: 0, target: 'A', detected: 'B' }]`

## 当前状态
视觉辅助引导现在不只会告诉用户完成度，还能给出下一步位置和错放修正提示。该改动仅在本地完成，尚未发布公网。
