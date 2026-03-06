# 2026-03-05 成品详情页提示统一（登录失效可读化）

## 问题
- 成品详情页（FinishedWorkDetailPage）仍在使用 `window.alert / window.confirm`。
- 登录失效时提示较生硬，不统一，用户体验与其他页面不一致。

## 修改
- 文件：`perler-beads/src/pages/mobile/FinishedWorkDetailPage.tsx`
- 引入统一弹窗组件：`Modal` + `useModal`。
- 将以下提示改为统一弹窗：
  - 点赞失败
  - 举报提交成功/失败
  - 登录状态失效
  - 删除失败
- 删除确认从 `window.confirm` 改为统一 `showConfirm`。
- 页面底部挂载 `<Modal {...modalProps} />`。

## 行为变化（通俗）
- 修复前：
  - 弹窗风格不一致，提示比较“系统化”，可读性一般。
- 修复后：
  - 统一成应用内弹窗风格，标题+正文更清晰；
  - 登录失效会给出明确提示，再引导登录，和其他页面一致。

## 验证
- `npm run build` 通过。
- MCP 冒烟访问：`/mobile/finished/1` 页面可正常加载（当前数据返回“作品不存在或不可见”）。

## 备注
- 本次仅做提示链路统一与可读性优化，不改接口协议与业务流程。
