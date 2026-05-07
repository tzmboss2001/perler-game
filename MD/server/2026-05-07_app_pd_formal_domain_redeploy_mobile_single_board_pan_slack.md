# 2026-05-07 正式域名单板沉浸式上下拖动余量修复发布记录

## 发布范围

- 正式域名：`https://app-pd.shop888.vip`
- 前端主包：`assets/index-BV3_hzPS.js`
- 代码提交：`770d5034 fix: allow mobile single-board vertical pan slack`
- 发布内容：手机端单板沉浸式低中倍率上下轻微平移、300% 以上正常边界拖动、多板切换误触保护。

## 发布方式

- 使用 `SCRIPT/deploy_frontend_ssh.py` 发布当前 `perler-beads/dist` 到正式服务器。
- 登录用户：`ubuntu`
- 远端站点目录：`/www/wwwroot/perler-beads`
- API upstream：`http://127.0.0.1:8012`
- 发布脚本返回：`[OK] deploy completed`
- `nginx -t` 通过，`nginx` reload 成功。
- HTTPS 证书未到续期时间，保持现有证书。

## 发布前验证

- `cmd /c node --test TEST\single_board_interaction.test.mjs`：46/46 通过。
- `cmd /c npm.cmd run build`：通过，生成 `assets/index-BV3_hzPS.js`。

## 公网验证

- `https://app-pd.shop888.vip/`：HTTP 200，首页 HTML 引用 `assets/index-BV3_hzPS.js`。
- `https://app-pd.shop888.vip/mobile/home?ts=1778167000`：HTTP 200。
- `https://app-pd.shop888.vip/mobile/making?ts=1778167000`：HTTP 200。
- `https://app-pd.shop888.vip/assets/index-BV3_hzPS.js`：HTTP 200。
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`：HTTP 200，返回 `code:0`。

## MCP 验证

- 移动视口 `390x844` 访问正式首页：页面正常渲染，能看到“拼豆工坊”“开始创作”“社区作品”。
- 直接访问正式制作页：未登录状态下正常跳转到 `/mobile/login`，没有黑屏。
- 控制台未出现应用崩溃类 `error`；仅有表单可访问性提示和输入 autocomplete 提示。

## 真实环境验收建议

- 使用新标签访问 `https://app-pd.shop888.vip/mobile/home?ts=1778167000`，避免旧 HTML 缓存。
- 进入一个已有图案或从编辑页保存并开始制作，切到手机端单板模式。
- 在 100%、150%、200% 左右上下拖动图纸：应能轻微上下平移，但不会无限拖走。
- 放大到 300% 以上：应能按画布边界上下左右拖动。
- 点“工具”展开工具抽屉后拖动画布：底层画布不应移动。
- 多板图纸缩小到可切板状态后，先上下轻微拖动：不应立刻误切板；拖到边缘继续滑动才切换。
- 点“复位”：图纸应回到合理居中位置。
