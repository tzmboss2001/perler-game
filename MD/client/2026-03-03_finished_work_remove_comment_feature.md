# 2026-03-03 去掉成品评论功能（按需求调整）

## 变更背景
- 用户明确要求：不要评论功能。

## 本次调整
1. 后端下线评论入口
- 删除路由：
  - `POST /api/v1/finished-works/:id/comments`
  - `GET /api/v1/finished-works/:id/comments`
- 文件：
  - `perler-beads-server/server/router/finished_work.go`
  - `perler-beads-server/server/api/v1/finishedwork/finished_work.go`

2. 前端去掉评论调用与 UI
- 删除 `finishedWorkApi` 中评论相关类型和方法：
  - `FinishedWorkCommentItem`
  - `listComments`
  - `createComment`
- 成品详情页移除评论区域与评论按钮，仅保留：点赞、举报、作者删除。
- 文件：
  - `perler-beads/src/services/api/finishedWorkApi.ts`
  - `perler-beads/src/pages/mobile/FinishedWorkDetailPage.tsx`

## 验证
- `go build .`（`perler-beads-server/server`）通过
- `cmd /c npm run build`（`perler-beads`）通过
