# 2026-03-03 两个管理员账号配置（客户端）

## 目标
- 按需求设置两个管理员账号。

## 处理方式
- 前端管理员判定默认值由 `1` 改为 `2,4`。
- 涉及文件：
  - `src/pages/mobile/ProfilePage.tsx`
  - `src/pages/mobile/CommunityModerationPage.tsx`
  - `src/pages/admin/AdminConsolePage.tsx`

## 结果
- `id=2`、`id=4` 在未设置 `VITE_COMMUNITY_ADMIN_IDS` 时默认拥有后台入口与后台访问权限。

## 验证
- `npm run build` 通过。
