# 2026-03-03 社区我的发布状态接口

## 本次目标
- 给已登录用户提供“我的社区发布”列表，展示审核状态与驳回原因。

## 修改内容
1. 新增请求模型
- 文件：`perler-beads-server/server/model/request/community_req.go`
- 新增 `CommunityMyPostListRequest`（`page`、`pageSize`、`review_status`）。

2. 响应模型扩展
- 文件：`perler-beads-server/server/model/response/community_resp.go`
- `CommunityPostListItem` 新增 `review_reason`。

3. 服务层新增能力
- 文件：`perler-beads-server/server/service/community.go`
- 新增 `GetMyPosts(userID, req)`：按当前用户分页查询发布记录，返回审核状态/驳回原因。

4. API与路由
- 文件：`perler-beads-server/server/api/v1/community/community.go`
- 新增 `GetMyPosts` 接口。
- 文件：`perler-beads-server/server/router/community.go`
- 新增路由：`GET /api/v1/community/my/posts`

## 验证
- `gofmt -w ...` 通过
- `go build .`（`perler-beads-server/server`）通过
