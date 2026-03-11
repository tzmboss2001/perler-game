# 2026-03-06 社区预览图与详情不一致修复

## 问题
- 列表预览图与实际作品内容不一致（点进详情发现不是同一作品图）。

## 根因
- 列表接口 `GetPosts` 未稳定补齐/重建 `preview_url`。
- 当 `bead_data` 被自动修正时，旧 `thumbnail/preview` 不会强制重建，导致图文错位。

## 修复
- `GetPosts` 中：
  - 若 `bead_data` 被修正，强制清空并重建 `thumbnail_url`/`preview_url`。
  - 每条列表都执行 `ensurePostPreview`，缺失时自动生成。
- `GetPostByID` 中：若 `bead_data` 被修正，同步强制重建预览链路。

## 修改文件
- `perler-beads-server/server/service/community.go`

## 发布
- 后端二进制已重新编译并发布到服务器，`perler-beads.service` 已重启。

## 验证
- `GET /api/v1/community/posts` 返回的 `preview_url` 已批量存在。
- `GET /api/v1/community/posts/:id` 与列表预览字段一致。
