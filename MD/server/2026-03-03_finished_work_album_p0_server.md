# 2026-03-03 成品相册P0服务端落地

## 本次目标
- 新增“用户成品相册”最小闭环：可创建、查看我的列表、删除。

## 新增能力
1. 数据模型
- 文件：`perler-beads-server/server/model/entity/finished_work.go`
- 新表：`finished_works`
- 字段：`user_id`、`title`、`description`、`cover_url`、`image_urls`、`image_count`、`is_public`、时间戳。

2. 请求/响应模型
- 文件：
  - `server/model/request/finished_work_req.go`
  - `server/model/response/finished_work_resp.go`
- 创建请求支持：`images_base64`（1~9张）
- 列表返回：封面图、多图URL、图片数量、公开状态。

3. 服务层
- 文件：`server/service/finished_work.go`
- 新增：
  - `Create`
  - `ListMy`
  - `Delete`
- 图片存储策略：
  - 将 Base64 图片写入 `perler-beads/public/finished-works`
  - URL 格式：`/finished-works/fw_{id}_{index}.ext`
  - 支持 png/jpg/webp/gif 后缀识别。

4. API与路由
- 文件：
  - `server/api/v1/finishedwork/finished_work.go`
  - `server/router/finished_work.go`
  - `server/initialize/router.go`
- 私有路由（需登录）：
  - `POST /api/v1/finished-works`
  - `GET /api/v1/finished-works/my`
  - `DELETE /api/v1/finished-works/:id`

5. 数据库迁移
- 文件：`server/initialize/gorm.go`
- `AutoMigrate` 新增 `&entity.FinishedWork{}`。

## 验证
- `go build .`（`perler-beads-server/server`）通过

## 备注
- 这是 P0 相册能力，后续可继续接入“成品发布到社区动态”和审核链路。
