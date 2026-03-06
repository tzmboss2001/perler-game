# 2026-03-02 社区作品缩略图不可见修复记录

## 问题现象
- 社区页面能看到作品卡片，但看不到作品具体图像（图片加载失败）。

## 根因分析
- 后端 `saveThumbnail` 把缩略图固定写到 Linux 路径：`/www/wwwroot/perler-beads/thumbnails`。
- 在 Windows 本地开发环境该路径不可写，导致缩略图文件未生成，前端只能拿到无效的 `thumbnail_url`。

## 修复内容
- 文件：`perler-beads-server/server/service/community.go`
- 修改：
  - 新增 `resolveThumbnailDir()`，按优先级解析缩略图目录：
    1. `THUMBNAIL_DIR` 环境变量
    2. 本地项目目录 `perler-beads/public/thumbnails`
    3. 生产默认目录 `/www/wwwroot/perler-beads/thumbnails`
  - `saveThumbnail()` 改为调用 `resolveThumbnailDir()`，不再写死单一路径。

## 验证结果
- 执行：`go test ./...`
- 结果：通过（无编译错误）。

## 备注
- 已发布但缺失缩略图的历史作品不会自动补图；新发布作品将按新目录策略正确生成缩略图。
