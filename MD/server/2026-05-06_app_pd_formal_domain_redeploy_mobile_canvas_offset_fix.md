# 2026-05-06 正式域名单板工作区偏移修复发布记录

## 发布范围

- 正式域名：https://app-pd.shop888.vip
- 前端构建主包：`assets/index-CtOfBlgK.js`
- 代码提交：`9775ad64 fix: correct mobile single-board canvas offset`

## 问题根因

单板制作模式移动端布局中，`canvasWrapper` 本身已经位于 `canvasContainer` 内部，而 `canvasContainer` 已经被页面顶部的模式切换、进度、提示、缩放条等区域向下排列。

之前把页面级顶部 chrome 高度再次作为 `canvasWrapper.top` 使用，导致顶部高度被重复计算。表现为图纸工作区实际从更低位置开始，用户看到约一半高度没有被有效利用。

这是前端布局计算问题，不是后端接口、后端服务或正式域名配置问题。

## 修复内容

- 单板移动端 `canvasWrapper.top` 改为使用容器内部局部偏移。
- 页面级顶部 chrome 高度仍保留给需要页面级定位的状态条逻辑。
- 新增回归测试，锁定移动端单板模式下局部偏移不再误用页面级偏移。

## 发布验证

- `node --test TEST\single_board_interaction.test.mjs`：40/40 通过。
- `npm run build`：通过，产物包含 `assets/index-CtOfBlgK.js`。
- 部署脚本返回 `[OK] deploy completed`。
- Nginx 配置检查通过。
- `https://app-pd.shop888.vip/`：HTTP 200。
- `https://app-pd.shop888.vip/mobile/home`：HTTP 200。
- 首页 HTML 已引用 `assets/index-CtOfBlgK.js`。
- `https://app-pd.shop888.vip/assets/index-CtOfBlgK.js`：HTTP 200。
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`：HTTP 200，返回 `code:0`。
- MCP 正式域名页面渲染正常，控制台无 error，关键资源和接口请求均为 200。

## 用户验证建议

- 关闭旧标签页或给正式域名加时间戳参数后重新进入。
- 进入制作页，切换到单板模式。
- 检查图纸区域是否紧跟缩放条下方开始，不再出现由重复顶部偏移造成的大块空白。
- 点击或拖动画布后，检查移动端主工具条是否折叠为核心按钮，二级功能通过工具入口打开。
- 同时抽测传统模式，确认传统模式布局没有变化。
