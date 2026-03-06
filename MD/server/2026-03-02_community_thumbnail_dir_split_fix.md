# 2026-03-02 社区发布后首页无预览图（缩略图目录分叉）修复

## 现象
- 用户发布新作品后，社区首页显示该作品无预览图。
- 接口返回 `thumbnail_url=/thumbnails/post_7.png`，但前端访问该地址实际返回 `index.html`（`text/html`），非图片。

## 根因
- 缩略图写入目录出现分叉：
  - 旧文件在 `perler-beads/public/thumbnails`
  - 新文件被写到 `D:\www\wwwroot\perler-beads\thumbnails`
- 前端 `localhost:3005` 仅能直接读取项目 `public` 目录静态文件，导致同一路径在本地命不中真实图片。

## 修复内容
- 文件：`perler-beads-server/server/service/community.go`
- 修改 `resolveThumbnailDir()`：
  - 优先从当前工作目录向上搜索项目内 `perler-beads/public/thumbnails`
  - 若未命中，再从可执行文件目录向上搜索
  - 最后才回退到生产默认目录 `/www/wwwroot/perler-beads/thumbnails`
- 新增 `findFrontendThumbnailDirFrom(base string)`，统一实现“向上查找前端 public 目录”逻辑。

## 验证
- 后端重新编译并重启成功（8012 监听正常）。
- 触发社区列表请求后，`ensurePostThumbnail` 自动迁移并补齐：
  - `D:\work\web\perler-beads-creator\perler-beads\public\thumbnails\post_7.png` 已存在。
- `http://localhost:3005/thumbnails/post_7.png` 返回：
  - `Status: 200`
  - `Content-Type: image/png`

## 结论
- 作品发布、入库流程正常，问题是缩略图落盘目录不一致。
- 修复后本地开发环境下新发布作品可稳定显示社区预览图。
