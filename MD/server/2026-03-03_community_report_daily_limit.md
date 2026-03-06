# 2026-03-03 社区举报防刷限流（服务端）

## 本次改动
1. 新增举报日限额
- 文件：`perler-beads-server/server/service/community.go`
- 新增：
  - `communityDailyReportLimit()`
  - `checkDailyReportLimit(userID)`
- 环境变量：`COMMUNITY_DAILY_REPORT_LIMIT`（默认 50，<=0 视为不限制）

2. 举报提交接入限流校验
- 文件：`perler-beads-server/server/service/community.go`
- 方法：`CreateReport`
- 在创建举报前执行每日举报次数检查，超限直接返回错误。

## 验证
- `gofmt -w` 通过
- `go build .`（`perler-beads-server/server`）通过

## 目的
- 降低恶意举报刷量风险，保护审核队列稳定性。
