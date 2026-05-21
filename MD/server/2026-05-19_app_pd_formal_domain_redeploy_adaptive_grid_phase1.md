# 2026-05-19 app-pd.shop888.vip 正式域名重发记录（Adaptive Grid Phase1）

## 发布目标

- 正式域名：`https://app-pd.shop888.vip`
- 发布内容：制作模式新增可选“网格增强”模式，增强当前板和视口中心区域的 5x5 / 10x10 网格可读性。
- 本次没有杀掉本机 node 进程。
- 本次未处理 admin console、backend、deploy 脚本优化分支。

## 发布来源

- 分支：`feature/adaptive-grid-phase1`
- worktree：`C:\Users\tzm\.config\superpowers\worktrees\perler-beads-creator\adaptive-grid-phase1`
- 关键提交：
  - `225c5959 test: add adaptive grid visual contracts`
  - `2d664c62 feat: add adaptive grid enhancement mode`
  - `400aa639 docs: record adaptive grid phase1`
  - `e46971ed fix: avoid grid toggle style warning`

## 构建信息

- 构建命令：`cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_adaptive_grid_phase1 --emptyOutDir`
- 构建结果：通过。
- 前端入口 JS：`assets/index-CtkyNMq7.js`
- 说明：Vite 仍提示部分 chunk 超过 500 kB，这是既有体积 warning，不是构建失败。

## 发布操作

- 使用 `SCRIPT\deploy_frontend_ssh.py` 将 `TEMP\deploy_dist_adaptive_grid_phase1` 发布到服务器。
- 远端目录：`/www/wwwroot/perler-beads`
- Nginx 检查：
  - `nginx: configuration file /www/server/nginx/conf/nginx.conf test is successful`
- HTTPS 证书：
  - `Certificate not yet due for renewal; no action taken.`
- 脚本结果：
  - `[OK] deploy completed`

## 线上验证

1. 首页 HTML：
   - `https://app-pd.shop888.vip/?ts=20260519-adaptive-grid`
   - 返回：`200`
   - 已引用：`assets/index-CtkyNMq7.js`
2. 主入口资源：
   - `https://app-pd.shop888.vip/assets/index-CtkyNMq7.js`
   - 返回：`200`
3. 制作页路由：
   - `https://app-pd.shop888.vip/mobile/making?ts=20260519-adaptive-grid`
   - 返回：`200`
   - 已引用：`assets/index-CtkyNMq7.js`
4. 后端公开接口：
   - `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`
   - 返回：`200`
   - 响应包含：`"code":0`

## 真机复测建议

- 建议新开浏览器标签访问：`https://app-pd.shop888.vip/mobile/create?ts=20260519-adaptive-grid`
- 进入制作模式后打开设置，启用“网格增强”。
- 重点检查：
  - 默认模式是否仍是轻网格。
  - 开启增强后当前板和视口中心区域的 5x5 辅助线是否更清楚。
  - 当前格、高亮色号、色号文字、当前板边界是否仍比网格更突出。
  - 缩放临界点是否有闪烁。
  - 换色、自动跳下一板、分板导出是否不受影响。

## 回滚方式

1. 回到上一个已知正常前端提交重新构建。
2. 使用 `SCRIPT\deploy_frontend_ssh.py` 重新发布旧构建产物。
3. 如只需要临时规避视觉影响，可保持代码不回滚，仅不启用“网格增强”，因为该功能默认关闭。
