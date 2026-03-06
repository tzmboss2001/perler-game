# 2026-03-03 成品社区互动闭环 Phase2（前端）

## 本次目标
- 在成品详情页提供可操作互动：点赞、评论、举报、作者删除。

## 改动内容
1. API 扩展
- 文件：`src/services/api/finishedWorkApi.ts`
- 新增：
  - `toggleLike(id)`
  - `listComments(id, page, pageSize)`
  - `createComment(id, content)`
  - `report(id, reason, detail)`
- 扩展 `FinishedWorkItem`：`like_count`、`comment_count`、`liked`
- 新增 `FinishedWorkCommentItem` 类型。

2. 详情页交互
- 文件：`src/pages/mobile/FinishedWorkDetailPage.tsx`
- 新增能力：
  - 点赞（状态实时刷新）
  - 评论列表加载 + 发评论
  - 举报弹窗输入（prompt）
  - 作者删除入口（删除后返回个人页）
  - 未登录时自动跳登录并回跳当前详情页

## 验证
- `cmd /c npm run build`（`perler-beads`）通过。

## 备注
- 评论/举报交互先采用轻量输入方式（prompt/input），后续可升级为统一 Modal。
