# 2026-03-06 公网部署 app-pd.shop888.vip

## 目标
- 将前端发布到公网域名：`app-pd.shop888.vip`
- 采用 Python + paramiko 自动化 SSH/SFTP 部署。

## 服务器连通验证
- IP: `119.29.139.249`
- 用户: `ubuntu`
- SSH 登录验证通过。
- 域名解析验证：`app-pd.shop888.vip -> 119.29.139.249`

## 执行动作
1. 本地构建前端：`npm run build`
2. 新增脚本：`SCRIPT/deploy_frontend_ssh.py`
3. 用脚本上传 `perler-beads/dist` 到服务器 `/www/wwwroot/perler-beads`
4. 自动写入 Nginx 配置：`/www/server/panel/vhost/nginx/app-pd.shop888.vip.conf`
5. `nginx -t` + `nginx -s reload`

## 线上验证
- `http://app-pd.shop888.vip/` 返回 `200`

## 备注
- 服务器后端 `8012` 已在运行；前端 `/api`、`/thumbnails`、`/finished-works` 已配置反向代理到 `127.0.0.1:8012`。
