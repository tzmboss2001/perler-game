# 社区历史作品详情图回填能力

日期：2026-03-02

## 改动
1. 新增管理员接口：`POST /api/v1/community/moderation/previews/backfill`
   - 请求：`{ "limit": 200 }`
   - 作用：批量回填缺失 `preview_url` 的作品。
2. 服务层新增 `BackfillMissingPreviews(limit)`。
3. 审核台增加“回填详情图”按钮，可直接触发回填。

## 文件
- `server/model/request/community_req.go`
- `server/api/v1/community/community.go`
- `server/router/community.go`
- `server/service/community.go`
- `src/services/api/communityApi.ts`
- `src/pages/mobile/CommunityModerationPage.tsx`

## 验证
- 后端 `go build .` 通过
- 前端 `cmd /c npm run build` 通过
