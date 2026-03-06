# 2026-03-02 社区预览图缺失自动修复

## 现象
- 首页社区列表看不到预览图。
- 点进社区详情也看不到作品图片。

## 根因
- 历史作品缩略图文件在旧目录（如 `D:\www\wwwroot\perler-beads\thumbnails`）。
- 当前前端实际读取目录是 `perler-beads/public/thumbnails`，导致路径有值但文件缺失。

## 修复
- 文件：`perler-beads-server/server/service/community.go`
- 新增能力：
  1. 社区列表/详情读取时自动检查缩略图是否存在。
  2. 若新目录缺失，自动从旧目录迁移对应文件到新目录。
  3. 若旧目录也不存在，则基于 `bead_data` 自动生成缩略图并落盘。

## 验证
- `go test ./...` 通过。
- 触发 `/api/v1/community/posts` 后，`post_2.png` 已自动迁移到：
  - `D:\work\web\perler-beads-creator\perler-beads\public\thumbnails\post_2.png`
- 页面侧验证：
  - 首页 `/mobile/home` 的社区图片 `naturalWidth` 正常（`post_2.png = 496`）。
  - 详情 `/mobile/community/2` 图片 `naturalWidth` 正常（`496`）。
