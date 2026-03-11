# 2026-03-06 缩略图静态目录错配修复

## 问题现象
- 社区详情页与首页卡片请求 ` /thumbnails/post_x_detail.png ` 返回 404。
- 前端会退回到本地根据 `bead_data` 生成 base64 预览，导致“列表有时空白 / 详情与列表体验不一致”。

## 根因
- 后端写入缩略图目录使用 `resolveThumbnailDir()`，线上实际落盘在：
  - `/www/wwwroot/perler-beads/thumbnails`
- Gin 静态路由目录使用 `resolveStaticDir()`，在当前工作目录下回退到了：
  - `/www/wwwroot/perler-beads-server/thumbnails`
- 读写目录不一致，导致 URL 可生成但文件被挂载到错误目录，返回 404。

## 修复内容
- 文件：`perler-beads-server/server/initialize/router.go`
- 调整 `resolveStaticDir()`：
  - 新增 Linux 线上优先候选目录：
    - `/www/wwwroot/perler-beads/<subDir>`
    - `/www/wwwroot/perler-beads/public/<subDir>`
  - 先检查“目录本身存在”再返回；不存在时再走“父目录存在”的回退策略。
- 结果：静态路由 `/thumbnails` 与实际落盘目录一致。

## 发布与验证
- 重新编译 Linux 二进制并发布。
- 重启 `perler-beads` 服务后验证：
  - `curl -I http://127.0.0.1:8012/thumbnails/post_8_detail.png` => `HTTP/1.1 200 OK`
  - `curl -I http://app-pd.shop888.vip/thumbnails/post_8_detail.png` => `HTTP/1.1 200 OK`
- MCP 复测：
  - 详情页网络请求 `GET /thumbnails/post_8_detail.png` 返回 200。
  - 首页社区列表图片 URL 正常加载，预览图与详情一一对应。

## 影响范围
- 社区图纸列表、社区详情页、首页社区瀑布流、依赖 `/thumbnails/*` 的展示位。
