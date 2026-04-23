# 2026-04-23 正式域名发布：桌面端单板模式制作区压缩优化

## 发布目标

- 域名：`https://app-pd.shop888.vip`
- 对应代码提交：`3224eee3 feat: compact desktop single-board making layout`

## 本次发布内容

- 桌面端单板模式继续压缩顶部专属信息区
- 合并 `继续上次制作 / 自动切下一板 / 收起总览` 到头部
- 移除桌面端单板独立快捷行与未完成板块行
- 收紧桌面端单板工作流卡片、总览卡片、板导航与底部任务条按钮尺寸
- 保持传统模式和手机端布局不变

## 发布过程

1. 本地重新完成验证：
   - `node --test TEST\single_board_interaction.test.mjs`
   - `npm.cmd run build`
2. 正式部署脚本 `SCRIPT/deploy_frontend_ssh.py` 执行超时
3. 改为手动发布：
   - 将当前 `perler-beads/dist` 打包为 `TEMP/deploy_dist_20260423.zip`
   - 上传到服务器 `/home/ubuntu/deploy_dist_<timestamp>.zip`
   - 远端解压到临时目录
   - 执行：
     - `rsync -a <tmp>/assets/ /www/wwwroot/perler-beads/assets/`
     - `rsync -a --delete --exclude assets <tmp>/ /www/wwwroot/perler-beads/`
     - `nginx -t`
     - `nginx -s reload`

## 发布结果

- `nginx -t` 通过
- `nginx -s reload` 成功
- 正式站首页入口已切到：
  - `assets/index-CALuckeF.js`
  - `assets/index-C5FPifGG.css`

## 公网验证

### HTTP

- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `200`
- `https://app-pd.shop888.vip/assets/index-CALuckeF.js` 返回 `200`

### MCP

- 正式站首页 `https://app-pd.shop888.vip/mobile/home` 正常渲染
- 首页依赖分包均返回 `200`，包括：
  - `MobileLayout-CnN8kTNw.js`
  - `HomePage-jsRQxapD.js`
  - `timeUtils-SbLihy5N.js`
  - `Heart.es-i1j0O0TU.js`
  - `Camera.es-DV6Ia2bx.js`
  - `GridFour.es-CglDHfEF.js`
  - `Palette.es-Dyi6jLUo.js`
  - `communityApi-DAUGjxth.js`
  - `finishedWorkApi-BErKg6tS.js`
- MCP 控制台无新的 `error` / `warn`

## 备注

- 本次正式发布使用的是“本地构建包压缩上传 + 远端解压同步”的方式。
- 当前正式站已可继续验证桌面端单板模式制作区高度优化效果。
