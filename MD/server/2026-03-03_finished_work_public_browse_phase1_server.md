# 2026-03-03 成品社区公开浏览（后端）

## 目标
- 在已有“我的成品相册（私有）”基础上，补齐公开浏览接口，支持手机端社区化查看成品照片。

## 本次修改
1. 新增公开接口
- `GET /api/v1/finished-works/public`：分页获取公开成品列表
- `GET /api/v1/finished-works/:id`：获取公开成品详情

2. 服务层实现
- 文件：`perler-beads-server/server/service/finished_work.go`
- 新增：
  - `ListPublic(req *request.ListFinishedWorkRequest)`
  - `GetPublicByID(id uint)`
- 逻辑：
  - 仅查询 `is_public = true`
  - 联表 `users` 返回作者昵称和头像
  - 兼容 `image_urls` JSON 反序列化

3. 响应模型扩展
- 文件：`perler-beads-server/server/model/response/finished_work_resp.go`
- 新增 `FinishedWorkAuthor`
- `FinishedWorkItem` 增加 `user` 字段（可选）

4. 路由接入
- 文件：
  - `perler-beads-server/server/router/finished_work.go`
  - `perler-beads-server/server/initialize/router.go`
- 新增 `InitFinishedWorkPublicRouter(publicGroup)`，并注册到公开路由组。

## 验证
- `go build .`（目录：`perler-beads-server/server`）通过。

## 备注
- `initialize/router.go` 存在历史编码导致语法断裂，已重写为等价的干净版本并保持原有路由结构。
