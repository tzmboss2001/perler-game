# 2026-03-14 社区作者主页一期后端接口

## 目标
- 为社区作者主页补齐第一版公开接口。
- 让前端可以拉取作者资料、作者公开图纸、作者公开成品。

## 本次新增
- 公开用户主页接口：`GET /api/v1/user/public/:id`
- 作者公开图纸接口：`GET /api/v1/community/users/:userId/posts`
- 作者公开成品接口：`GET /api/v1/finished-works/users/:userId/public`

## 返回内容
- 用户主页：昵称、头像、加入时间、图纸数、成品数、总获赞、总被制作次数
- 公开图纸：沿用社区卡片列表结构
- 公开成品：沿用成品社区列表结构

## 涉及文件
- `perler-beads-server/server/model/response/user_resp.go`
- `perler-beads-server/server/service/user_public.go`
- `perler-beads-server/server/service/community.go`
- `perler-beads-server/server/service/finished_work.go`
- `perler-beads-server/server/api/v1/community/community.go`
- `perler-beads-server/server/api/v1/finishedwork/finished_work.go`
- `perler-beads-server/server/api/v1/user/user.go`
- `perler-beads-server/server/router/community.go`
- `perler-beads-server/server/router/finished_work.go`
- `perler-beads-server/server/router/user.go`
- `perler-beads-server/server/initialize/router.go`

## 验证
- `go build ./...` 通过
