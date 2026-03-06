# 2026-03-03 举报自动提优先级与高优筛选（服务端）

## 本次目标
- 将举报从“纯人工排队”升级为“自动风控提优先级”，让高风险内容更快进入审核。

## 本次改动
1. 举报数据结构增强
- 文件：`perler-beads-server/server/model/entity/community_report.go`
- 新增字段：
  - `priority`：0普通，1高优
  - `risk_reason`：高优触发原因

2. 举报列表请求增强
- 文件：`perler-beads-server/server/model/request/community_req.go`
- 新增参数：`high_only`（仅拉取高优先级举报）

3. 举报响应结构增强
- 文件：`perler-beads-server/server/model/response/community_resp.go`
- 新增返回：`priority`、`risk_reason`

4. 自动提优先级规则
- 文件：`perler-beads-server/server/service/community.go`
- 新增环境变量：
  - `COMMUNITY_REPORT_ESCALATE_THRESHOLD`（默认 3）
  - `COMMUNITY_REPORT_ESCALATE_WINDOW_HOURS`（默认 24）
- 新增逻辑：同一作品在时间窗内举报次数达到阈值时，自动标记新举报为高优。

5. 审核统计增强
- 文件：`perler-beads-server/server/service/community.go`
- `GetModerationStats` 新增指标：`high_priority_reports`

6. 举报列表查询优化
- 文件：`perler-beads-server/server/service/community.go`
- 支持 `high_only` 过滤；排序改为：`status ASC, priority DESC, created_at DESC`

## 验证
- `gofmt -w` 通过
- `go build .`（`perler-beads-server/server`）通过

## 结果
- 举报流程具备了基础自动风控能力，高风险举报可优先处理。
