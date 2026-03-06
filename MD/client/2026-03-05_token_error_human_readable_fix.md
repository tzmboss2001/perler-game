# 2026-03-05 Token错误文案用户可读性修复

## 用户反馈
- 弹窗出现“无效的Token”，普通用户无法理解，体验差。

## 根因
- 某些接口错误直接透传后端原始 msg 到 `showError`，导致技术术语暴露给用户。
- 个别鉴权失效判断存在边界漏判（code 可能为字符串）。

## 修复
- 文件：`perler-beads/src/components/Modal.tsx`
  - `showError` 增加错误文案归一化：命中 token/未登录/未授权/鉴权关键词时，统一展示“登录状态已失效，请重新登录”。
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
  - 鉴权失效判断改为兼容 number/string code，并统一中文关键词“鉴权”。
- 文件：`perler-beads/src/pages/mobile/FinishedWorkDetailPage.tsx`
  - 同步兼容 number/string code 的鉴权失效判断。

## 验证
- MCP 回归：`/mobile/community/11` 点击点赞后，不再出现“无效的Token”技术文案，链路跳转登录页正常。
- 构建：`npm.cmd run build` 通过。
