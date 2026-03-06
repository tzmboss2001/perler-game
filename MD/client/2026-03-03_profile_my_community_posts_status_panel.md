# 2026-03-03 个人页新增我的社区发布状态面板

## 本次目标
- 用户在个人页直接看到社区发布审核状态，避免“发布后无反馈”。

## 修改内容
1. 社区API前端封装增强
- 文件：`perler-beads/src/services/api/communityApi.ts`
- 新增：
  - `CommunityMyPostListParams`
  - `communityApi.getMyPosts(...)`
- `CommunityPostListItem` 增加 `review_reason` 字段。

2. 个人页展示新增
- 文件：`perler-beads/src/pages/mobile/ProfilePage.tsx`
- 新增“我的社区发布”板块：
  - 加载最近6条我的发布
  - 显示审核状态（待审/通过/驳回/下架）
  - 驳回时显示驳回原因
  - 点击可进入作品详情页

## 验证
- `npm run build`（`perler-beads`）通过
