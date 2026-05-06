# 2026-05-06 正式域名单板移动端工具条遮挡修复发布

## 发布目标
- 正式域名：`https://app-pd.shop888.vip`
- 发布内容：手机端单板制作模式工具条遮挡图纸修复
- 前端主包：`assets/index-BDhoD_tu.js`
- 主线功能提交：`aa7afe51 fix: prevent mobile single-board toolbar overlay`

## 发布方式
- 使用 `SCRIPT/deploy_frontend_ssh.py` 发布当前 `dist` 到正式服务器。
- 登录用户：`ubuntu`
- 远端站点目录：`/www/wwwroot/perler-beads`
- 发布脚本返回：`[OK] deploy completed`
- `nginx -t` 通过，`nginx` reload 成功。

## 公网验证
- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/assets/index-BDhoD_tu.js` 返回 `200`
- `https://app-pd.shop888.vip/assets/MobileLayout-DEPExqHX.js` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `code:0`

## MCP 验证
- 正式站首页可正常渲染：
  - `拼豆工坊`
  - `开始创作`
  - `社区作品`
- 直接访问 `https://app-pd.shop888.vip/mobile/making?ts=1778066800` 时，在未登录状态下正常跳转到登录页。
- 控制台未发现新的 `error / warn`。

## 真机验收重点
- 手机端进入制作模式后切到单板模式。
- 顶部工具条不应遮挡图纸。
- 初始工具条可展开显示核心操作。
- 点击、拖动或缩放图纸后，工具条应自动收薄为 `总览 / 复位 / 完成 / 工具`。
- 点击 `工具` 后应能展开次级功能，例如 `自动切换 / 图纸 / 辅助`。
