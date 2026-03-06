# 2026-03-02 用户偏好云同步接口

## 目标
- 让“我的色板”支持登录后云端同步，避免换设备丢失。

## 后端改动
1. 新增实体表
- `server/model/entity/user_preference.go`
- 表：`user_preferences`
- 字段：`user_id`（唯一）、`my_color_ids`（JSON）

2. 自动迁移
- `server/initialize/gorm.go`
- `AutoMigrate` 新增 `&entity.UserPreference{}`

3. 新增用户偏好接口
- `GET /api/v1/user/preferences`
- `PUT /api/v1/user/preferences`
- 文件：`server/api/v1/user/user.go`
- 路由：`server/router/user.go`

4. 注销联动清理
- `server/service/auth.go`
- 删除账号时新增清理 `user_preferences`

## 验证
- `go build .`（`perler-beads-server/server`）通过。
- 接口实测：偏好写入后可正确读取。
