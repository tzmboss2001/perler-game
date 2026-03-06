# 2026-03-03 社区举报闭环一期（服务端）

## 本次目标
- 打通社区举报最小闭环：用户可举报，审核台可查看并处理，采纳可自动下架作品。

## 本次改动
1. 新增举报实体与表
- 文件：`server/model/entity/community_report.go`
- 表：`community_reports`
- 字段：`post_id`、`post_user_id`、`reporter_id`、`reason`、`detail`、`status`、`handle_note`、`handled_by`、`handled_at` 等。

2. 自动迁移接入
- 文件：`server/initialize/gorm.go`
- `AutoMigrate` 新增 `CommunityReport`。

3. 举报接口请求/响应模型
- 文件：`server/model/request/community_req.go`
- 新增：
  - `CreateCommunityReportRequest`
  - `CommunityModerationReportListRequest`
  - `HandleCommunityReportRequest`
- 文件：`server/model/response/community_resp.go`
- 新增 `CommunityReportItem`。

4. 举报服务能力
- 文件：`server/service/community.go`
- 新增：
  - `CreateReport`：提交举报（含去重与参数校验）
  - `GetModerationReports`：举报列表分页
  - `HandleReport`：处理举报（accept/reject）
- 处理规则：
  - `accept`：举报采纳，作品自动下架（`status=0`、`review_status=3`），并写入审核日志。
  - `reject`：举报驳回，仅更新举报状态。

5. 接口与路由
- 文件：`server/api/v1/community/community.go`
- 新增接口：
  - `POST /api/v1/community/posts/:id/report`
  - `GET /api/v1/community/moderation/reports`
  - `POST /api/v1/community/moderation/reports/:id/handle`
- 文件：`server/router/community.go`
- 已接入上述路由。

6. 审核统计增强
- 文件：`server/service/community.go`
- `GetModerationStats` 新增：
  - `pending_reports`
  - `today_reports`

## 验证
- `gofmt -w`：通过
- `go build .`（`perler-beads-server/server`）：通过

## 说明
- 这是举报闭环一期，后续可继续补：举报分类字典、批量处理、自动风控阈值、举报证据图片。
