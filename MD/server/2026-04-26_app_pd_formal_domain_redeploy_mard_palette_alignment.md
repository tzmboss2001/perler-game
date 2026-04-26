## 发布主题

正式域名发布 MARD 官方色库口径对齐版本。

## 对应代码提交

- `ba12f6aa feat: align MARD official palettes`

## 发布内容

- 前端正式包已切换到包含 MARD 色库口径对齐的版本：
  - 官方色库只保留 `MARD 221 常用色`
  - `MARD 291 全色`
  - `我的颜色` 独立为个人库存层
  - `48 / 72 / 96 / 150 / 200 / 291` 只作为颜色精简控制项

## 本次构建

- 本地 fresh build 通过
- 正式站首页当前引用主包：
  - `assets/index-BKXwqidg.js`

## 发布方式

- 先执行：
  - `python SCRIPT\deploy_frontend_ssh.py ...`
- 脚本在上传后阶段超时
- 随后确认远端临时目录已生成：
  - `/home/ubuntu/deploy_dist_1777210122`
- 使用远端手动切换：
  - `rsync -a /home/ubuntu/deploy_dist_1777210122/assets/ /www/wwwroot/perler-beads/assets/`
  - `rsync -a --delete --exclude assets /home/ubuntu/deploy_dist_1777210122/ /www/wwwroot/perler-beads/`
  - `nginx -t`
  - `nginx -s reload`

## 公网验证

- `https://app-pd.shop888.vip`
  - 返回 `200`
- `https://app-pd.shop888.vip/mobile/home`
  - 返回 `200`
- 首页 HTML 已引用：
  - `assets/index-BKXwqidg.js`

## 额外发现

- 公共接口：
  - `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`
- HTTP 返回 `200`
- 但业务响应为：
  - `code:7`
  - `msg: fetch failed: Error 1045 (28000): Access denied for user 'root'@'localhost' ...`

说明：
- 本次前端发布已成功生效
- 但正式环境后端当前存在数据库鉴权异常
- 这不是本次前端构建是否切换成功的问题，而是线上后端现状，需要单独排查
