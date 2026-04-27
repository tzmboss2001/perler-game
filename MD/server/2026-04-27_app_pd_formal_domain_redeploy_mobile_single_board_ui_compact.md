## 发布主题

正式域名发布手机端单板制作模式首屏 UI 压缩优化。

## 发布内容

- 上线手机端单板制作模式首屏工具收薄版本。
- 首屏仅保留 `总览 / 复位 / 完成 / 工具 / 缩放`。
- `图纸 / 辅助 / 自动切换 / 换色 / 继续未完成` 收进 `工具` 面板。
- 不修改桌面侧边栏主流程。

## 发布方式

- 在集成 worktree 中重新执行前端构建。
- 使用 `SCRIPT/deploy_frontend_ssh.py` 发布到正式服务器。
- 发布脚本返回 `[OK] deploy completed`。

## 线上校验

- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `code:0`
- 当前首页主包：
  - `assets/index-DI0euxLy.js`
- MCP 正式站首页回归正常渲染：
  - `拼豆工坊`
  - `开始创作`
  - `社区作品`

## 备注

- 本次发布对应功能提交：`b01bdab5 feat: compact mobile single-board making ui`
