# 2026-04-25 正式域名发布记录：桌面端制作页侧边栏优化

## 发布目标
- 域名：`https://app-pd.shop888.vip`
- 发布内容：桌面宽屏制作页侧边栏、主区压缩、工具迁移相关前端改动

## 对应代码提交
- 功能提交：`c1fa5d94 feat: optimize desktop making sidebar layout`

## 本地发布前验证
- `cmd /c npm.cmd run build`：通过
- `cmd /c node --test TEST\single_board_interaction.test.mjs`：`32/32` 通过

## 发布过程
1. 使用 `python SCRIPT\deploy_frontend_ssh.py --host 119.29.139.249 --user ubuntu --password ***** --local-dist D:\work\web\perler-beads-creator\perler-beads\dist` 进行正式发布。
2. 脚本执行超时后，检查到远端临时目录上传不完整，线上 `index.html` 已切到新版本，但新主包未完整上传。
3. 改用手动方式补部署：
   - 将当前 `perler-beads/dist` 复制到 `TEMP/deploy_dist_stage`
   - 重新打包为 `TEMP/deploy_dist_desktop_sidebar_20260425.zip`
   - 上传到服务器 `/home/ubuntu/deploy_dist_desktop_sidebar_20260425.zip`
   - 远端解压到 `/home/ubuntu/deploy_dist_final_1777088838`
   - 执行：
     - `rsync -a /home/ubuntu/deploy_dist_final_1777088838/assets/ /www/wwwroot/perler-beads/assets/`
     - `rsync -a --delete --exclude assets /home/ubuntu/deploy_dist_final_1777088838/ /www/wwwroot/perler-beads/`
     - `nginx -t`
     - `nginx -s reload`

## 线上结果
- 当前首页主包：
  - `assets/index-KISN83sk.js`
  - `assets/index-C5FPifGG.css`

## 公网验证
- `http://app-pd.shop888.vip`：`301`，跳转到 `https://app-pd.shop888.vip/`
- `https://app-pd.shop888.vip`：`200`
- `https://app-pd.shop888.vip/mobile/home`：`200`
- `https://app-pd.shop888.vip/assets/index-KISN83sk.js`：`200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`：`200`

## 说明
- 本次正式发布最终以手动补传 zip + 远端解压切换的方式完成。
- 线上已确认切到包含桌面端制作页侧边栏优化的新版本。

