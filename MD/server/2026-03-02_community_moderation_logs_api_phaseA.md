# 社区审核日志查询接口（Phase A 补全）

日期：2026-03-02

## 改动
1. 请求模型新增：`CommunityModerationLogListRequest`
   - 文件：`server/model/request/community_req.go`
2. 响应模型新增：`CommunityReviewLogItem`
   - 文件：`server/model/response/community_resp.go`
3. 服务层新增：`GetModerationLogs`
   - 文件：`server/service/community.go`
   - 能力：支持分页、按 `post_id` 过滤、返回审核人昵称。
4. API 新增：`GET /api/v1/community/moderation/logs`
   - 文件：`server/api/v1/community/community.go`
5. 路由接入：`communityRouter.GET("moderation/logs", ...)`
   - 文件：`server/router/community.go`

## 验证
- `go build .` 通过。
