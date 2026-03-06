# 2026-03-03 举报证据链接字段与接口打通

## 目标
- 让举报支持携带证据链接，审核端可看到证据，提升处理可信度。

## 修改内容
1. 举报实体扩展
- 文件：`perler-beads-server/server/model/entity/community_report.go`
- 新增字段：`evidence_urls`（数据库存 JSON 字符串，text）。

2. 请求/响应模型扩展
- 文件：`perler-beads-server/server/model/request/community_req.go`
- `CreateCommunityReportRequest` 新增 `evidence_urls []string`。
- 同时修复 `CommunityModerationReportListRequest` 字段粘连问题。

- 文件：`perler-beads-server/server/model/response/community_resp.go`
- `CommunityReportItem` 新增 `evidence_urls []string`。

3. 服务层处理逻辑
- 文件：`perler-beads-server/server/service/community.go`
- `CreateReport` 增加 `evidenceURLs` 参数。
- 新增 `normalizeEvidenceURLs`：
  - 仅保留 `http/https`
  - 单条长度上限 1024
  - 最多保留 5 条
- 入库前将证据链接数组序列化为 JSON 字符串。
- 在 `GetModerationReports` / `GetReportAlerts` 中反序列化返回 `evidence_urls`。

4. API接入
- 文件：`perler-beads-server/server/api/v1/community/community.go`
- 举报接口改为透传 `req.EvidenceURLs` 给服务层。

## 验证
- `gofmt -w ...` 通过
- `go build .`（`perler-beads-server/server`）通过

## 备注
- 该方案先走“证据链接上传（URL）”模式，兼容后续接入真实文件上传/CDN。
