# 2026-03-03 审核台超时筛选与待办优先队列（客户端）

## 本次目标
- 提升审核员处理效率：快速定位超时举报，并提供待办优先队列。

## 本次改动
1. API类型增强
- 文件：`perler-beads/src/services/api/communityApi.ts`
- `CommunityModerationStats` 新增 `overdue_reports`
- `CommunityModerationReportListParams` 新增 `overdue_only`
- `CommunityReportItem` 新增 `overdue`、`age_hours`
- `getModerationReports` 支持透传 `overdue_only`

2. 审核台筛选与展示增强
- 文件：`perler-beads/src/pages/mobile/CommunityModerationPage.tsx`
- 新增筛选：`仅超时`
- 新增统计卡：`超时待处理举报`
- 举报项显示：
  - SLA超时标识
  - 等待时长（小时）

3. 待办优先队列
- 文件：`perler-beads/src/pages/mobile/CommunityModerationPage.tsx`
- 新增“待办优先队列（Top 5）”：按超时 > 高优 > 等待时长排序，帮助先处理最紧急项。

## 验证
- `npm run build`（`perler-beads`）通过

## 结果
- 审核员可按超时直接筛选，且可快速查看当前最紧急待办。
