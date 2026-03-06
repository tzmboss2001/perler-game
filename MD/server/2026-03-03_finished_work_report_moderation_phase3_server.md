# 2026-03-03 成品举报审核闭环 Phase3（服务端）

## 本次目标
- 在“无评论版”前提下，补齐成品举报审核闭环：管理员可查看举报列表并处理。

## 新增能力
1. 成品举报审核列表
- `GET /api/v1/finished-works/moderation/reports`
- 支持分页与状态筛选（`status=-1/0/1/2`）

2. 成品举报处理
- `POST /api/v1/finished-works/moderation/reports/:reportId/handle`
- `action`：`accept` / `reject`
- 处理结果：
  - `accept`：举报状态置为已采纳，同时将对应成品 `is_public=false`
  - `reject`：举报状态置为已驳回

## 数据结构更新
- `finished_work_reports` 增加字段：
  - `handle_note`
  - `handled_by`
  - `handled_at`
- `status` 语义更新：`0待处理 1已采纳 2已驳回`

## 代码修改
- `server/model/entity/finished_work_report.go`
- `server/model/request/finished_work_req.go`
- `server/model/response/finished_work_resp.go`
- `server/service/finished_work.go`
- `server/api/v1/finishedwork/finished_work.go`
- `server/router/finished_work.go`

## 验证
- `go build .`（`perler-beads-server/server`）通过。
