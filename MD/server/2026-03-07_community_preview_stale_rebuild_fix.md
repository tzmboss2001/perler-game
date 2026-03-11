# 2026-03-07 社区预览图与制作数据错位修复（post_10案例）

## 现象
- 社区卡片/详情页显示的预览图与点击“开始制作”后的实际方案不一致。
- 复现样例：`拼豆方案_36_2020`（id=10）。

## MCP复现与定位
1. `GET /api/v1/community/posts/10` 返回 bead_data 与当前 `post_10_detail.png` 视觉内容不一致。
2. `post_10_detail.png` 文件存在，但属于旧内容（陈旧预览图）。
3. 原逻辑只要 `preview_url` 文件存在就直接复用，不判断是否过期。

## 根因
- 预览图文件按固定文件名 `post_{id}_detail.png` 保存。
- 当帖子内容更新后，若预览重建失败或未触发，旧文件仍会被复用。
- 服务端缺少“文件是否落后于 post.updated_at”的判定。

## 修复
文件：`perler-beads-server/server/service/community.go`

1. 新增媒体 URL 版本参数（缓存隔离）
- 返回列表/详情时，对 `thumbnail_url`、`preview_url` 追加 `?v=<updatedAt.Unix>`。
- 避免客户端或CDN长期命中旧缓存。

2. 新增文件过期判定
- 新增 `thumbnailFileOutdated(thumbnailURL, updatedAt)`。
- 若文件 `modTime < updatedAt - 2s`，判定为过期。

3. 强化自动重建条件
- `ensurePostThumbnail`：仅当“文件存在且未过期”才复用；否则重建。
- `ensurePostPreview`：仅当“文件存在且未过期”才复用；否则重建。

4. 健壮性处理
- `thumbnailFileExists` 支持去除 URL query（`?v=`）后再取文件名。

## 验证
- `go test ./service/...` 通过。

## 预期效果
- 社区预览图与进入制作页的数据保持一致。
- 同一路径文件更新后，客户端可立即看到新预览，降低“图文错位”概率。
