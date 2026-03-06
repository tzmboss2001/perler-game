# 2026-03-03 审核台举报批量操作与模板原因（客户端）

## 本次目标
- 降低审核台重复点击成本，支持批量处理举报。

## 本次改动
1. API 增强
- 文件：`perler-beads/src/services/api/communityApi.ts`
- 新增类型：`BatchHandleCommunityReportsData`
- 新增方法：`batchHandleReports`

2. 审核台交互增强
- 文件：`perler-beads/src/pages/mobile/CommunityModerationPage.tsx`
- 新增能力：
  - 举报多选
  - 一键“全选待处理”
  - 备注模板下拉（广告/辱骂/低俗/侵权/违规其他/举报不成立）
  - 批量采纳下架
  - 批量驳回举报
- 批量后自动刷新举报列表、作品列表、审核日志和统计数据。

## 验证
- `npm run build`（`perler-beads`）通过

## 结果
- 审核员可高效处理批量举报，显著减少人工重复操作。
