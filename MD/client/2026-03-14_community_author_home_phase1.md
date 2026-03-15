# 2026-03-14 社区作者主页一期前端落地

## 目标
- 从社区作品详情和成品详情进入作者主页。
- 在作者主页查看该作者的公开图纸作品和公开成品作品。

## 本次实现
- 新增作者主页页面：`/mobile/community/user/:userId`
- 页面内容：
  - 作者头像、昵称、加入时间
  - 图纸作品数、成品作品数、累计获赞、被制作次数
  - `图纸作品 / 成品作品` 双分栏
- 社区作品详情页作者区可点击进入作者主页
- 成品详情页作者信息可点击进入作者主页
- 前端 API 新增：
  - `userApi.getPublicProfile()`
  - `communityApi.getPostsByUser()`
  - `finishedWorkApi.listPublicByUser()`

## 涉及文件
- `perler-beads/src/services/api/userApi.ts`
- `perler-beads/src/services/api/communityApi.ts`
- `perler-beads/src/services/api/finishedWorkApi.ts`
- `perler-beads/src/pages/mobile/CommunityUserPage.tsx`
- `perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- `perler-beads/src/pages/mobile/FinishedWorkDetailPage.tsx`
- `perler-beads/src/router/index.tsx`

## 验证
- `npm run build` 通过
- `go build ./...` 通过
- 本地 MCP 验证作者主页页头、双分栏和作者入口可正常打开
