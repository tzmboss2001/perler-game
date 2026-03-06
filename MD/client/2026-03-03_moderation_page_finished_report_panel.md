# 2026-03-03 审核台接入成品举报处理区块

## 目标
- 在现有“社区审核台”页面中直接接入成品举报处理，管理员无需跳转新页面。

## 本次改动
1. 页面接入成品举报数据源
- 文件：`src/pages/mobile/CommunityModerationPage.tsx`
- 新增引入：`finishedWorkApi` 与 `FinishedWorkReportItem`
- 新增状态：
  - 成品举报状态筛选、加载态、列表、分页、处理中ID

2. 新增数据加载与处理逻辑
- `loadFinishedReports(page, status)`
- `handleFinishedReportAction(item, action)`
- 管理员登录后自动拉取成品举报列表

3. 新增 UI 区块
- “成品举报处理”面板：
  - 状态筛选（全部/待处理/已采纳/已驳回）
  - 列表展示（举报ID、成品ID、举报人、原因、说明、处理信息）
  - 操作按钮（采纳并下架 / 驳回举报）
  - 分页切换

## 验证
- `cmd /c npm run build` 通过。
