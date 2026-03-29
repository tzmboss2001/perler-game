# 2026-03-22 project create bad connection fix

## 问题
- 编辑页点击“保存并开始制作”后，前端仍然出现“云端异常”提示。
- MCP 复测后确认：`/api/v1/project/create` 请求发出后，后端返回应用层错误 `创建失败: driver: bad connection; driver: bad connection`。
- 这说明剩余问题不在前端序列化，而在后端 MySQL 连接池复用了坏连接。

## 修复
1. `server/initialize/gorm.go`
- 为 MySQL 连接池增加：
  - `SetConnMaxLifetime(5 * time.Minute)`
  - `SetConnMaxIdleTime(2 * time.Minute)`
- 建连后立即 `Ping()`，避免启动时拿到不可用连接还继续对外提供服务。

2. `server/service/project.go`
- `ProjectService.Create()` 在遇到 `bad connection` 时增加一次重试。
- 重试前调用 `sqlDB.Ping()`，促使连接池刷新坏连接。
- 只针对坏连接做一次兜底，不改变其它错误语义。

## 结果
- 这次修复的目标是消除由于 MySQL 坏连接导致的“云端异常”提示。
- 前端之前的透明格 `null` 序列化问题已独立修复；本次处理的是后端数据库连接稳定性。
