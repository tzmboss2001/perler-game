# 2026-03-06 首页刷新登录状态延迟修复

## 问题
- 首页刷新后顶部状态先显示“游客模式”，进入“我的”再返回才显示“已登录”。

## 根因
- `MobileLayout` 未在页面初始化阶段调用 `initUser`，首页首屏缺少登录态初始化。

## 修复
- 在 `MobileLayout` 挂载时调用 `useUserStore().initUser()`，确保首页首屏即可拿到本地登录态。

## 修改文件
- `perler-beads/src/pages/mobile/MobileLayout.tsx`

## 验证
- 构建通过并已发布到 `http://app-pd.shop888.vip`。
