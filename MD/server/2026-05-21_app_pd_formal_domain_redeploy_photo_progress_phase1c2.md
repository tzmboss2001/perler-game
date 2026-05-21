# 2026-05-21 app-pd.shop888.vip 正式域名重发记录（拍照同步 Phase1-C-2）

## 发布目标

- 正式域名：`https://app-pd.shop888.vip`
- 发布内容：拍照同步进度 Phase1-C-2，支持“识别预览 → 用户确认 → 本地保存 → 返回制作页”的闭环。
- 发布 commit：`fa2b0e31`
- 发布 worktree：`D:\work\web\perler-beads-creator\TEMP\release-fa2b0e31-photo-progress-c2`

## 发布前边界

- 未进入 Phase1-C-3 已完成遮罩。
- 未改后端、云同步、多板自动识别、自动纠错、实时摄像头。
- 未改制作页手势、缩放、拖动、切板、复位逻辑。
- 未写入现有 `boardStatusMap`，保存结果只进入拍照同步本地 snapshot。

## 发布前验证

- `npm.cmd ci`：通过。
- `node TEST\photo_progress_confirmation_model.test.mjs`：2/2 pass。
- `node TEST\photo_progress_persistence.test.mjs`：6/6 pass。
- `node TEST\photo_progress_modal_contract.test.mjs`：7/7 pass。
- `node TEST\single_board_interaction.test.mjs`：47/47 pass。
- `node TEST\mobile_immersive_visual_contract.test.mjs`：6/6 pass。
- `npm.cmd run build`：通过。

构建 warning：

- Vite 仍提示部分 chunk 超过 500 kB，这是既有体积 warning，不是构建失败。

## 构建产物

- 本地主包：`assets/index-zL5f41w7.js`
- 本地主包 SHA256：`B2CB86B90DCF2721A52DDE7664D79617D75D1FD275E38026957BAA720EC0DEE9`

## 发布操作

使用正式部署脚本：

- `SCRIPT\deploy_frontend_ssh.py`
- 服务器：`119.29.139.249`
- 用户：`ubuntu`
- 远端目录：`/www/wwwroot/perler-beads`

部署脚本结果：

- nginx 配置检查通过。
- HTTPS 证书未到期，无需续签。
- nginx reload 成功。
- 脚本返回：`[OK] deploy completed`

## 线上验证

公网 HTTP 验证：

- `https://app-pd.shop888.vip/?ts=20260521-photo-progress-c2`：200
- `https://app-pd.shop888.vip/mobile/home?ts=20260521-photo-progress-c2`：200
- `https://app-pd.shop888.vip/mobile/making?ts=20260521-photo-progress-c2`：200
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`：200，返回 `code:0`

线上主包核对：

- 线上主包：`assets/index-zL5f41w7.js`
- 线上 SHA256：`B2CB86B90DCF2721A52DDE7664D79617D75D1FD275E38026957BAA720EC0DEE9`
- 与本地构建产物一致：是

MCP 页面确认：

- `https://app-pd.shop888.vip/mobile/home?ts=20260521-photo-progress-c2-mcp` 正常渲染首页和社区列表。
- 未登录访问 `https://app-pd.shop888.vip/mobile/making?ts=20260521-photo-progress-c2-mcp` 正常跳转 `/mobile/login`，符合当前认证边界。
- 控制台未发现新的阻断级应用错误。

已知非本次问题：

- 登录页表单字段存在浏览器 autocomplete/id/name 提示。
- React style shorthand/non-shorthand warning 仍属于既有 warning。

## 真机测试建议

请用新标签或清缓存访问：

- `https://app-pd.shop888.vip/mobile/home?ts=20260521-photo-progress-c2`

真机观察重点：

- 长时间制作后进入“拍照同步（试验）”是否自然。
- 上传照片、四角校准、空孔取样是否容易理解。
- 候选完成、疑似错误、未完成、低可信是否容易区分。
- 保存后返回制作页是否顺畅。
- Android / iPhone 图片方向、上传、取样和弹层尺寸是否一致。

## 回滚方法

如需回滚：

1. 找到上一版正式发布的 release worktree 或构建产物。
2. 重新执行 `SCRIPT\deploy_frontend_ssh.py` 发布上一版 `dist`。
3. 验证首页、移动首页、制作页、API 和主包 hash。

## 结论

拍照同步 Phase1-C-2 已发布到正式域名，线上主包与本地构建产物一致。当前进入真实手机观察期，暂不继续扩展 Phase1-C-3。
