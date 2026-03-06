# 2026-03-03 社区举报入口与审核台接入（客户端）

## 本次目标
- 给社区详情页增加举报入口，并在审核台接入举报列表与处理操作。

## 本次改动
1. 社区 API 扩展
- 文件：`perler-beads/src/services/api/communityApi.ts`
- 新增：
  - `reportPost`
  - `getModerationReports`
  - `handleReport`
- 新增类型：
  - `CreateCommunityReportData`
  - `CommunityReportItem`
  - `CommunityModerationReportListParams`
  - `HandleCommunityReportData`
- 审核统计类型新增：`pending_reports`、`today_reports`。

2. 作品详情页举报入口
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- 底部操作栏新增“举报”按钮。
- 点击后弹窗输入举报原因（必填）和补充说明（可选），提交到后端。

3. 审核台举报处理面板
- 文件：`perler-beads/src/pages/mobile/CommunityModerationPage.tsx`
- 新增“举报处理”区块：
  - 按状态筛选（待处理/已采纳/已驳回）
  - 查看举报原因与说明
  - 操作按钮：采纳并下架 / 驳回举报
- 审核统计卡新增举报指标展示。

## 验证
- `npm run build`（`perler-beads`）：通过

## 说明
- 当前举报入口使用浏览器 prompt 快速实现，后续建议替换为统一 Modal 表单以提升移动端交互体验。
