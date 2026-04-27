## 时间
- 2026-04-27

## 目标
- 将“颜色精简等级化”前端改动发布到正式域名 `https://app-pd.shop888.vip`

## 发布内容
- 编辑页色系设置改为 `官方色库 / 个人库存 / 精简程度`
- 精简程度改为五档：
  - `保真`
  - `轻度`
  - `适中`
  - `明显`
  - `极简`
- 前台不再把 `48 / 72 / 96 / 150 / 200 / 291` 作为主交互文案

## 发布方式
- 本地集成 worktree：`TEMP/integrate-color-simplify-level`
- 构建命令：
  - `cmd /c npm.cmd run build`
- 发布命令：
  - `python SCRIPT\\deploy_frontend_ssh.py --host 119.29.139.249 --user ubuntu --password \"Qazwsx1-2!DY\" --local-dist D:\\work\\web\\perler-beads-creator\\TEMP\\integrate-color-simplify-level\\perler-beads\\dist`

## 正式站资源
- 首页主包：`assets/index-D9fAKlUE.js`
- 编辑页分包：`assets/EditorPage-B6LR0n9M.js`
- 样式包：`assets/index-C5FPifGG.css`

## 验证
- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `code:0`
- MCP 页面级验证：
  - 正式站 `https://app-pd.shop888.vip/mobile/editor`
  - 色系设置中可见 `MARD 291 全色 / 精简程度 适中`
  - 五档精简程度按钮全部显示
  - 点击 `明显` 后摘要同步为 `精简程度 明显`
  - 控制台 `error / warn` 为 `0`

## 结果
- 正式域名已完成发布
- 新的 MARD 官方色库与精简程度口径已在线生效
