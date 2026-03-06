# 2026-03-03 独立后台运营平台 Phase2（完善版）

## 目标
- 将后台做成主流运营台风格：独立视觉、独立信息架构、完整运营操作链路。

## 本次完成
1. 后台页面升级（/admin）
- 文件：`src/pages/admin/AdminConsolePage.tsx`
- 架构：左侧导航 + 右侧工作区
- 功能页签：
  - 仪表盘（核心运营指标）
  - 作品审核（状态筛选、通过/驳回/下架/恢复、分页）
  - 社区举报（状态/高优/超时筛选、单条处理、批量处理、分页）
  - 成品举报（状态筛选、单条处理、分页）
  - 审核日志（按作品ID筛选、分页）
- 运营工具：详情预览图回填按钮

2. 用户端入口收口
- `ProfilePage` 中管理员入口改为“运营后台”，跳转 `/admin`
- `router/index.tsx` 将 `/mobile/community/moderation` 改为重定向到 `/admin`

3. 权限逻辑
- 复用 `VITE_COMMUNITY_ADMIN_IDS`
- 未登录 / 非管理员都在后台页内拦截

## 修改文件
- `perler-beads/src/pages/admin/AdminConsolePage.tsx`
- `perler-beads/src/router/index.tsx`
- `perler-beads/src/pages/mobile/ProfilePage.tsx`

## 验证
- `cmd /c npm run build` 通过。
