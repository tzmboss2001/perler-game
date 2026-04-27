# 2026-04-27 正式域名发布：桌面单板制作工作区侧边栏优化

## 发布内容
- 发布提交：`b9dd3fb9 feat: optimize desktop making work area`
- 正式站前端主包：
  - `assets/index-DCDUc61P.js`
  - `assets/index-C5FPifGG.css`

## 发布方式
- 使用 `SCRIPT/deploy_frontend_ssh.py`
- 目标主机：`119.29.139.249`
- 账号：`ubuntu`
- 发布结果：`[OK] deploy completed`

## 验证
- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `code:0`
- MCP 打开首页 `https://app-pd.shop888.vip/mobile/home?ts=1777294988`
  - 页面正常渲染 `拼豆工坊 / 开始创作 / 社区作品`
  - 控制台 `error / warn` 为 `0`

## 说明
- 本次 UI 变更针对桌面宽屏单板制作模式，线上页面级行为验证仍以本地 MCP 制作页回归为主。
