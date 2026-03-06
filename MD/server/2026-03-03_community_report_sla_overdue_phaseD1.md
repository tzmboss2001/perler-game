# 2026-03-03 举报SLA超时识别与统计（服务端）

## 本次目标
- 让审核台可识别“超时未处理举报”，支持SLA治理。

## 本次改动
1. 请求参数增强
- 文件：`perler-beads-server/server/model/request/community_req.go`
- `CommunityModerationReportListRequest` 新增：
  - `overdue_only`（仅超时待处理）

2. 响应字段增强
- 文件：`perler-beads-server/server/model/response/community_resp.go`
- `CommunityReportItem` 新增：
  - `overdue`
  - `age_hours`

3. SLA配置与统计
- 文件：`perler-beads-server/server/service/community.go`
- 新增 `communityReportSLAHours()`，环境变量：`COMMUNITY_REPORT_SLA_HOURS`（默认24小时）
- `GetModerationStats` 新增 `overdue_reports` 统计。

4. 举报列表查询增强
- 文件：`perler-beads-server/server/service/community.go`
- `GetModerationReports` 支持 `overdue_only` 过滤。
- 列表项返回每条举报的超时状态与等待时长小时数。

## 验证
- `go build .`（`perler-beads-server/server`）通过

## 结果
- 后端已具备SLA超时识别能力，可直接用于审核台待办治理。
