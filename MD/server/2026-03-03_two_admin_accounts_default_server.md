# 2026-03-03 两个管理员账号配置（服务端）

## 目标
- 按需求设置两个管理员账号。

## 处理方式
- 服务端管理员判定默认值由 `id=1` 改为 `id=2 或 id=4`（当环境变量 `COMMUNITY_ADMIN_IDS` 为空时）。
- 涉及文件：
  - `server/api/v1/community/community.go`
  - `server/api/v1/finishedwork/finished_work.go`

## 结果
- `id=2`、`id=4` 默认可调用管理接口。
- 若后续配置了 `COMMUNITY_ADMIN_IDS`，仍以环境变量为准。

## 验证
- `go build .` 通过。
