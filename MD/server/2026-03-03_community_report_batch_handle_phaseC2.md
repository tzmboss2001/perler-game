# 2026-03-03 举报批量处理与模板化处置（服务端）

## 本次目标
- 提升审核效率：支持一次处理多条举报。
- 标准化处置备注：避免审核口径不一致。

## 本次改动
1. 新增批量处理请求模型
- 文件：`perler-beads-server/server/model/request/community_req.go`
- 新增 `BatchHandleCommunityReportsRequest`：
  - `report_ids`（1~100）
  - `action`（accept/reject）
  - `note`

2. 举报处理服务重构
- 文件：`perler-beads-server/server/service/community.go`
- 新增：
  - `BatchHandleReports`（批量处理）
  - `applyReportActionTx`（单条处理公共事务逻辑）
  - `normalizeReportHandleNote`（模板备注归一化）
- 模板键支持：
  - `spam_ad`
  - `abuse_hate`
  - `pornographic`
  - `copyright`
  - `illegal_other`
  - `misreport`

3. 新增批量处理接口
- 文件：`perler-beads-server/server/api/v1/community/community.go`
- 新增：`POST /api/v1/community/moderation/reports/batch-handle`

4. 路由接入
- 文件：`perler-beads-server/server/router/community.go`
- 新增对应路由挂载。

5. 稳定性修复
- 受历史编码污染影响，`community.go`（api/service）局部出现字符串与函数签名损坏。
- 本次已清理并恢复为可编译版本，避免再次阻断构建。

## 验证
- `go build .`（`perler-beads-server/server`）通过

## 结果
- 审核员可一次批量处理举报，且处理备注有统一模板，审核效率和一致性提升。
