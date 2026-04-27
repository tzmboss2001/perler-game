# 2026-04-27 正式域名发布：编辑页调节区横向重排

## 发布内容

- 功能提交：`feat: optimize editor control layout`
- 正式站目标：`https://app-pd.shop888.vip`
- 本次前端主包：`assets/index-FipXgpMH.js`

## 发布过程

1. 本地重新执行 `npm run build`
2. 使用 `SCRIPT/deploy_frontend_ssh.py` 发布到服务器临时目录
3. 脚本执行超时，但远端已生成：
   - `/home/ubuntu/deploy_dist_1777269877`
4. 远端手动执行：
   - `sudo rsync -a --delete --exclude='.well-known' /home/ubuntu/deploy_dist_1777269877/ /www/wwwroot/perler-beads/`
   - `sudo nginx -t`
   - `sudo nginx -s reload`

## 验证结果

- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `code:0`
- 首页 HTML 已切到：
  - `assets/index-FipXgpMH.js`

## 说明

- 这次主要是编辑页控件布局重排发布，不涉及后端代码变更。
- 远端正式目录存在 `.well-known`，因此手动 rsync 时排除了该目录，避免证书相关文件被误删。
