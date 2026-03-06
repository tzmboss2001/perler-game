# 2026-03-03 成品举报审核闭环 Phase3（客户端）

## 本次目标
- 为后续审核台接入准备前端 API（当前不做页面改造）。

## 变更内容
- `src/services/api/finishedWorkApi.ts` 新增：
  - `getModerationReports({ page, pageSize, status })`
  - `handleReport(reportId, action, note)`
- 新增类型：`FinishedWorkReportItem`

## 备注
- 本轮仅补 API 协议层，页面端稍后可在审核台中直接调用。

## 验证
- `cmd /c npm run build`（`perler-beads`）通过。
