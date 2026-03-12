# 制作页视觉辅助：错放颜色替换建议

## 日期
2026-03-12

## 目标
让视觉辅助在发现错放时，不只告诉用户“哪几格错了”，还给出更直接的颜色替换建议，帮助用户优先修正最常见的错色。

## 本次实现
1. 在识别结果中新增错色汇总：
- `wrongColorSuggestions`
- 按 `当前识别颜色 -> 目标颜色` 分组统计
- 取数量最多的前 3 组建议

2. 在视觉辅助弹层的 `优先修正` 区域中，新增汇总提示：
- `建议优先把 A -> B，共 N 格`
- 让用户先处理出现次数最多的错色类型

3. 保留原有单格详情：
- 仍然继续显示具体格子坐标
- 仍然显示 `应改成什么`、`当前更像什么`
- 形成“先看汇总，再看明细”的两层提示

## 涉及文件
- `perler-beads/src/services/visionAssistService.ts`
- `perler-beads/src/components/BoardVisionAssistModal.tsx`

## 验证
### 本地构建
- 执行：`npm run build`
- 结果：通过

### 代码接入检查
已确认以下内容存在：
- `VisionWrongColorSuggestion`
- `wrongColorSuggestions`
- `getWrongSuggestionLabel()`
- `建议优先把 ... 共 ... 格`
- `warningSummaryList` / `warningSummaryItem`

## 当前状态
- 仅本地完成
- 未发布公网
- 这轮是错放纠正能力增强，不依赖真机即可先完成
