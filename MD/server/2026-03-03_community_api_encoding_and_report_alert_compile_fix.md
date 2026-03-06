# 2026-03-03 社区接口编码与举报SLA编译修复

## 问题描述
1. `server/api/v1/community/community.go` 出现编码污染，部分字符串字面量断裂，导致后端不稳定。
2. `server/service/community.go` 的 `GetReportAlerts` 使用 `Order(sql, arg)`，与当前 GORM 调用签名不兼容，`go build` 报 `too many arguments`。
3. 同文件多处注释和函数声明粘连，导致 `expected declaration` 语法错误。

## 本次修改
- 重写 `server/api/v1/community/community.go` 为 UTF-8 干净版本，保留所有社区接口能力：
  - 列表/详情/发布/点赞/举报
  - 审核帖子/日志/统计/举报列表
  - 举报提醒、批量处理、回填预览、审核动作
- 修复 `server/service/community.go`：
  - `GetReportAlerts` 改为构造单一 `orderClause` 再 `Order(orderClause)`。
  - 修复 `HandleReport`、`GetModerationPosts`、`GetModerationStats`、`BackfillMissingPreviews` 等函数声明被注释吞掉的问题。
  - 修复 `normalizeReportHandleNote` 模板文案乱码，改为正常中文模板。

## 验证结果
- `gofmt -w server/api/v1/community/community.go server/service/community.go`：通过。
- `go build .`（工作目录 `perler-beads-server/server`）：通过。
- `npm run build`（工作目录 `perler-beads`）：通过。

## 影响范围
- 社区后端 API 稳定性提升。
- 举报提醒（SLA）查询链路可正常编译运行。
- 审核/举报相关接口不再因编码问题随机报错。
