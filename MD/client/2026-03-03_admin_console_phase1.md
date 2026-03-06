# 2026-03-03 独立后台运营平台 Phase1（/admin）

## 目标
- 按主流应用思路，把管理员操作从用户端中分离，提供独立后台入口。

## 本次交付
1. 新增独立后台页面
- 新文件：`src/pages/admin/AdminConsolePage.tsx`
- 路由入口：`/admin`
- 页面模块：
  - 作品审核（通过/驳回/下架/恢复）
  - 社区举报处理（采纳并下架/驳回举报）
  - 成品举报处理（采纳并下架/驳回举报）

2. 权限控制
- 复用管理员ID配置：`VITE_COMMUNITY_ADMIN_IDS`（默认含 1）
- 未登录提示去登录
- 非管理员拒绝访问

3. 与用户端分离
- 后台提供“回用户端”按钮，管理员可以在 `/admin` 独立操作。
- 目前用户端保留原审核入口，后续可按运营策略隐藏。

## 修改文件
- `perler-beads/src/pages/admin/AdminConsolePage.tsx`
- `perler-beads/src/router/index.tsx`

## 验证
- `cmd /c npm run build` 通过。
