# 2026-03-03 举报提交流程增加证据链接（客户端）

## 目标
- 用户举报时可附加证据链接，审核员在审核台可直接点击查看。

## 修改内容
1. API类型扩展
- 文件：`perler-beads/src/services/api/communityApi.ts`
- `CreateCommunityReportData` 新增 `evidence_urls?: string[]`
- `CommunityReportItem` 新增 `evidence_urls?: string[]`

2. 作品详情页举报流程增强
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- 举报步骤改为三段：
  1) 举报原因（必填）
  2) 补充说明（可选）
  3) 证据链接（可选，多个逗号分隔）
- 提交时将证据数组透传到后端。

3. 审核台展示证据
- 文件：`perler-beads/src/pages/mobile/CommunityModerationPage.tsx`
- 举报卡片新增证据展示，按“链接1/链接2...”可点击打开新标签。

## 验证
- `npm run build`（`perler-beads`）通过
