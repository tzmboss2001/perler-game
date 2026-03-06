# 2026-03-03 成品社区互动闭环 Phase2（后端）

## 本次目标
- 为成品社区补齐基础互动能力：点赞、评论、举报。
- 保证作者可删除自己成品时，互动数据可级联清理。

## 改动内容
1. 数据模型
- 新增表：
  - `finished_work_likes`
  - `finished_work_comments`
  - `finished_work_reports`
- 文件：
  - `server/model/entity/finished_work_like.go`
  - `server/model/entity/finished_work_comment.go`
  - `server/model/entity/finished_work_report.go`
- 扩展 `finished_works`：新增 `like_count`、`comment_count` 字段。

2. 请求/响应模型
- `request/finished_work_req.go` 新增：
  - `CreateFinishedWorkCommentRequest`
  - `CreateFinishedWorkReportRequest`
- `response/finished_work_resp.go` 新增：
  - `like_count`、`comment_count`、`liked`
  - `FinishedWorkCommentItem`

3. 服务层能力（`service/finished_work.go`）
- 新增：
  - `IsLiked`
  - `ToggleLike`
  - `ListComments`
  - `CreateComment`
  - `CreateReport`
- 删除成品时增加事务级联清理：点赞/评论/举报。

4. API 与路由
- `api/v1/finishedwork/finished_work.go` 新增：
  - `ToggleLike`
  - `ListComments`
  - `CreateComment`
  - `Report`
- `router/finished_work.go` 新增路由：
  - 私有：`POST /finished-works/:id/like`
  - 私有：`POST /finished-works/:id/comments`
  - 私有：`POST /finished-works/:id/report`
  - 公开：`GET /finished-works/:id/comments`

5. 迁移
- `initialize/gorm.go` 增加 3 张互动表 AutoMigrate。

## 验证
- `go build .`（`perler-beads-server/server`）通过。
