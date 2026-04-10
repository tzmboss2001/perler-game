# 2026-04-10 app-pd.shop888.vip HTTPS 部署脚本修复

本次修改了 `SCRIPT/deploy_frontend_ssh.py`，解决之前无法直接发布到公网的问题。

## 原因
- 服务器只能使用 `ubuntu` 登录，再通过 `sudo` 提权。
- 原脚本直接执行 `sudo`，没有传入密码，导致远程命令卡住。
- 原脚本只生成 HTTP nginx 配置，没有自动申请/部署 HTTPS 证书。

## 本次修改
1. 新增 `sudo -S` 执行能力，使用部署命令传入的密码完成提权。
2. 部署时先写入 HTTP 配置并 reload nginx，保证 `/.well-known/acme-challenge/` 可访问。
3. 使用 `certbot certonly --webroot` 为 `app-pd.shop888.vip` 签发/续用证书。
4. 再覆盖为 HTTPS nginx 配置，启用 `443 ssl` 与 `http -> https` 跳转。
5. 保留原有静态资源、SPA fallback、`/api`、`/thumbnails`、`/finished-works` 代理逻辑。

## 影响
- 后续前端发布可以直接通过脚本完成 HTTP/HTTPS 一体化部署。
- 本次目标站点为 `https://app-pd.shop888.vip`。
