# 社区审核台统计接口与面板

日期：2026-03-02

## 改动
1. 后端新增审核统计接口：`GET /api/v1/community/moderation/stats`
   - 统计字段：
     - total_posts
     - pending_count
     - approved_count
     - rejected_count
     - hidden_count
     - today_new_posts
     - today_reviews
     - today_backfilled
2. 前端审核台新增统计卡片展示，并与审核/回填动作联动刷新。

## 文件
- `server/service/community.go`
- `server/api/v1/community/community.go`
- `server/router/community.go`
- `src/services/api/communityApi.ts`
- `src/pages/mobile/CommunityModerationPage.tsx`

## 验证
- `go build .` 通过
- `cmd /c npm run build` 通过
