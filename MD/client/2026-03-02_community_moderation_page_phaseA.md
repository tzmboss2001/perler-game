# 社区审核台前端落地（Phase A）

日期：2026-03-02

## 改动
1. 新增审核页：`/mobile/community/moderation`
   - 文件：`src/pages/mobile/CommunityModerationPage.tsx`
   - 能力：按审核状态筛选、分页、执行通过/驳回/下架/恢复。
2. 路由接入审核页：`src/router/index.tsx`
3. 社区 API 增加审核接口：`src/services/api/communityApi.ts`
   - `getModerationPosts`
   - `reviewPost`

## 验证
- `cmd /c npm run build` 通过。

## 备注
- 管理员判定使用环境变量 `VITE_COMMUNITY_ADMIN_IDS`（默认 `1`）。
