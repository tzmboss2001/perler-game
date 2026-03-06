# 2026-03-03 审核台高优举报标记与筛选（客户端）

## 本次目标
- 让审核员在页面上快速识别并筛选高优先级举报。

## 本次改动
1. API 类型扩展
- 文件：`perler-beads/src/services/api/communityApi.ts`
- `CommunityModerationStats` 新增 `high_priority_reports`
- `CommunityReportItem` 新增 `priority`、`risk_reason`
- `CommunityModerationReportListParams` 新增 `high_only`
- `getModerationReports` 增加 `high_only=1` 查询参数

2. 审核台交互增强
- 文件：`perler-beads/src/pages/mobile/CommunityModerationPage.tsx`
- 举报区块新增“仅高优”筛选按钮
- 举报条目新增高优标记显示（含触发原因）
- 统计卡新增“高优先级举报”指标

## 验证
- `npm run build`（`perler-beads`）通过

## 结果
- 审核员可以更快定位高风险举报，审核效率更高。
