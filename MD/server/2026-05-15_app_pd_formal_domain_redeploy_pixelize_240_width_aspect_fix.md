# 2026-05-15 app-pd.shop888.vip 正式域名重发记录（编辑页 240 宽比例修复）

## 发布目标

- 正式域名：`https://app-pd.shop888.vip`
- 发布内容：编辑页选择 240 宽时，图纸生成不再因底层宽度限制导致人物被拉长变瘦。
- 本次没有杀掉本机 node 进程，没有执行 git 提交或推送。

## 本次相关客户端修改

- `perler-beads/src/services/pixelizeService.ts`
  - 像素化服务宽度上限从 200 对齐到编辑页的 240。
  - 先确定 `finalWidth`，再用 `finalWidth` 计算等比高度。
- `TEST/pixelize_dimensions_contract.test.mjs`
  - 新增 240 宽尺寸回归测试。
- `MD/client/2026-05-15_editor_pixelize_240_width_aspect_fix.md`
  - 客户端修改记录。

## 构建信息

- 构建命令：`cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_clean --emptyOutDir`
- 构建结果：通过。
- 主入口 JS：`assets/index-RqL__Y3P.js`
- 编辑页 JS：`assets/EditorPage-BDWkmds9.js`
- 说明：Vite 仍提示部分 chunk 超过 500 kB，这是既有体积 warning，不是构建失败。

## 发布操作

- 使用 `SCRIPT\deploy_frontend_ssh.py` 将 `TEMP\deploy_dist_clean` 发布到服务器。
- 远端目录：`/www/wwwroot/perler-beads`
- Nginx 检查：
  - `nginx: configuration file /www/server/nginx/conf/nginx.conf test is successful`
- HTTPS 证书：
  - `Certificate not yet due for renewal; no action taken.`
- 脚本结果：
  - `[OK] deploy completed`

## 线上验证

1. 首页 HTML：
   - `https://app-pd.shop888.vip/?ts=20260515-pixelize240`
   - 返回：`200 OK`
   - 已引用：`assets/index-RqL__Y3P.js`
2. 主入口资源：
   - `https://app-pd.shop888.vip/assets/index-RqL__Y3P.js`
   - 返回：`200 OK`
3. 编辑页资源：
   - `https://app-pd.shop888.vip/assets/EditorPage-BDWkmds9.js`
   - 返回：`200 OK`
   - 线上资源包含新的 240 宽逻辑。
4. 编辑页路由：
   - `https://app-pd.shop888.vip/mobile/editor?ts=20260515-pixelize240`
   - 返回：`200 OK`
5. 制作页路由：
   - `https://app-pd.shop888.vip/mobile/making?ts=20260515-pixelize240`
   - 返回：`200 OK`
6. 后端公开接口：
   - `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`
   - 返回：`code:0`
7. Chrome 打开正式编辑入口：
   - 业务上无编辑状态时跳转到上传页。
   - 控制台无 error/warn。

## 真机复测建议

- 建议新开标签访问：`https://app-pd.shop888.vip/mobile/create?ts=20260515-pixelize240`
- 使用同一张原图分别测试 200、208、240 宽。
- 重点确认 240 宽时人物不再变瘦，进入制作页和导出图纸的比例一致。

## 回滚方法

1. 还原 `perler-beads/src/services/pixelizeService.ts` 的宽高计算修改。
2. 重新执行 `cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_clean --emptyOutDir`。
3. 使用 `SCRIPT\deploy_frontend_ssh.py` 重新发布。
