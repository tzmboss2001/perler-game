# 2026-04-10 app-pd.shop888.vip HTTPS 正式发布记录

本次已将前端最新构建发布到公网，并完成 `app-pd.shop888.vip` 的 nginx 绑定与 HTTPS 证书配置。

## 发布目标
- 域名：`app-pd.shop888.vip`
- 站点目录：`/www/wwwroot/perler-beads`
- 反向代理上游：`http://127.0.0.1:8012`

## 本次实际完成
1. 将本地最新 `dist` 打包上传到服务器。
2. 覆盖站点目录为最新前端构建产物。
3. 写入 `app-pd.shop888.vip` 的 HTTP nginx 配置，并验证 `/.well-known/acme-challenge/` 可公网访问。
4. 使用 `certbot certonly --webroot` 为 `app-pd.shop888.vip` 签发证书。
5. 切换 nginx 为 HTTPS 配置，并启用 `http -> https` 跳转。

## 验证结果
- `http://app-pd.shop888.vip` 返回 `301`，已跳转到 `https://app-pd.shop888.vip/`
- `https://app-pd.shop888.vip` 可正常访问
- 公网首页资源哈希：
  - `assets/index-B3_Ap1Qc.js`
  - `assets/index-C5FPifGG.css`
- 服务器站点目录中的 `index.html` 资源哈希与公网一致，说明本次发布已生效。

## 额外说明
- 本次同时修复了部署脚本 `SCRIPT/deploy_frontend_ssh.py`：
  - 支持 `sudo -S` 提权执行
  - 支持先落 HTTP 配置再通过 `webroot` 申请 HTTPS 证书
  - 支持最后切换为 HTTPS nginx 配置
- 该脚本修改目前仍在本地工作区，尚未单独提交。
