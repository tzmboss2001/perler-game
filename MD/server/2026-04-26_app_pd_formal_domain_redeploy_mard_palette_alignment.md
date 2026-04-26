## 发布主题

正式域名发布 MARD 官方色库口径对齐版本，并补齐 `projectSaveAuthFlow.js` 漏提文件后的可重建发布。

## 对应代码提交

- `ba12f6aa feat: align MARD official palettes`
- `f4d0ae78 fix: add missing project save auth flow util`

## 发布内容

- 前端正式包已切换到包含 MARD 色库口径对齐的版本：
  - 官方色库只保留 `MARD 221 常用色`
  - `MARD 291 全色`
  - `我的颜色` 独立为个人库存层
  - `48 / 72 / 96 / 150 / 200 / 291` 只作为颜色精简控制项

## 本次构建

- 隔离 worktree：`TEMP/release-f4d0ae78-v2`
- 本地 fresh build 通过
- 本次重新发布后的正式站首页当前引用主包：
  - `assets/index-DHUN555-.js`

## 发布方式

- 使用正式发布脚本：
  - `python SCRIPT\deploy_frontend_ssh.py --host 119.29.139.249 --user root --password ***** --local-dist D:\work\web\perler-beads-creator\TEMP\release-f4d0ae78-v2\perler-beads\dist`
- 脚本本次执行成功
- 远端临时目录：
  - `/home/root/deploy_dist_1777216158`
- `nginx -t`：成功
- HTTPS 证书检查：
  - `Certificate not yet due for renewal; no action taken.`

## 公网验证

- `https://app-pd.shop888.vip`
  - 返回 `200`
- `https://app-pd.shop888.vip/mobile/home`
  - 返回 `200`
- `https://app-pd.shop888.vip/mobile/import-pattern`
  - 返回 `200`
- 首页 HTML 已引用：
  - `assets/index-DHUN555-.js`
- 主包资源：
  - `https://app-pd.shop888.vip/assets/index-DHUN555-.js` -> `200`

## 额外发现

- 公共接口：
  - `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`
- HTTP 返回 `200`
- 当前业务响应为：
  - `code:7`
  - `msg: invalid params`

说明：
- 本次前端发布已成功生效
- 线上当前首页、导入页和主包资源均已切到新版本
- 公共接口可达，但返回的是业务参数错误，不是本次前端发布阻塞项
