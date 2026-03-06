# 2026-03-06 成品先审后发后端改造

## 改造范围
- `model/entity/finished_work.go`
- `model/request/finished_work_req.go`
- `model/response/finished_work_resp.go`
- `service/finished_work.go`
- `api/v1/finishedwork/finished_work.go`
- `router/finished_work.go`

## 关键改动
### 1) 成品实体增加审核字段
- `status`（1 正常 / 0 删除）
- `review_status`（0 待审 / 1 通过 / 2 驳回 / 3 下架）
- `review_reason`

### 2) 创建成品改为先审后发
- 新增环境开关 `FINISHED_WORK_AUTO_APPROVE`:
  - `true/1/yes/on` -> 自动通过
  - 其他值或未设置 -> 默认待审核
- 私密成品（`is_public=false`）直接视为已通过（不进公开审核队列）

### 3) 公开流量闸口收紧
- 公开列表/详情/点赞/评论/举报统一要求:
  - `status=1`
  - `is_public=true`
  - `review_status=1`

### 4) 新增运营审核接口
- `GET /api/v1/finished-works/moderation/works`
- `POST /api/v1/finished-works/moderation/works/:workId/review`
  - 动作: `approve | reject | hide | restore`

### 5) 举报处理联动审核状态
- 采纳成品举报时，作品改为 `review_status=3`（下架）并写入原因。

## 验证
- `go build ./...` 通过。
