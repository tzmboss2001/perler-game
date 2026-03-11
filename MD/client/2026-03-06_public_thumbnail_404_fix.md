# 2026-03-06 公网首页社区缩略图404修复

## 问题
- 真机访问公网域名时，首页社区图片显示加载失败。
- 接口返回的 `thumbnail_url` 为 `/thumbnails/xxx.png`，但公网访问该路径返回 404。

## 根因
- 域名站点的 Nginx 把 `/thumbnails` 转发到了后端。
- 后端运行目录下的缩略图目录与站点静态目录不一致，导致转发后找不到文件。

## 修复
- 服务器文件：`/www/server/panel/vhost/nginx/app-pd.shop888.vip.conf`
- 将以下路径改为站点静态目录直出：
  - `/thumbnails/` -> `alias /www/wwwroot/perler-beads/thumbnails/`
  - `/finished-works/` -> `alias /www/wwwroot/perler-beads/finished-works/`
- 保留 `/api` 反向代理到 `127.0.0.1:8012`。
- 执行 `nginx -t` 与 `nginx -s reload` 生效。

## 验证
- `http://app-pd.shop888.vip/thumbnails/post_7.png` 返回 200（image/png）。
- `http://app-pd.shop888.vip/api/v1/community/posts?page=1&pageSize=1` 返回 200。

## 结论
- 公网真机首页社区图片加载问题已修复。
