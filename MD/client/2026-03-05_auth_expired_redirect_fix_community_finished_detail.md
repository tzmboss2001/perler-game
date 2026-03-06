# 2026-03-05 鉴权失效提示与跳转修复（社区/成品详情）

## 问题
- MCP 回归发现：游客状态下点击社区详情点赞，接口返回 `{"code":7,"msg":"无效的Token"}`，页面直接弹后端原文，未引导重新登录。
- 该问题会造成体验割裂，并容易误判为系统异常。

## 修复
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
  - 新增 `isAuthExpiredResponse` 鉴权失效判断（`code=7/401` 或消息命中 token/未登录关键词）。
  - 在点赞/举报返回中遇到鉴权失效时：清 token，弹统一提示“登录状态已失效，请重新登录”，确认后跳转登录页并带回跳地址。
- 文件：`perler-beads/src/pages/mobile/FinishedWorkDetailPage.tsx`
  - 同步接入鉴权失效判断逻辑。
  - 点赞/举报遇到失效时：清登录态并跳转登录页。

## 验证
- MCP 重放路径：`/mobile/community/11` -> 点赞。
- 修复前：弹窗“无效的Token”。
- 修复后：弹窗“登录状态已失效，请重新登录”，确认后进入 `/mobile/login`。
- 控制台 error：无。
- 构建：`npm.cmd run build` 通过。
