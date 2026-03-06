# 2026-03-03 社区分类自动化与筛选能力补齐（服务端）

## 背景
- 社区已有标签能力，但缺少统一的结构化分类字段，导致筛选和后续运营能力受限。
- 旧数据可能没有分类，前台分类筛选会出现不完整。

## 本次改动
1. 社区作品新增字段 `category`
- 文件：`server/model/entity/community.go`
- 字段：`category`，默认 `other`，并建立索引。

2. 发布接口支持分类入参并自动归类
- 文件：`server/model/request/community_req.go`
- 新增：`CreateCommunityPostRequest.category`
- 文件：`server/service/community.go`
- 逻辑：
  - 若请求带合法分类，直接使用。
  - 若未带或不合法，按标题+标签关键词自动推断分类（anime/game/animal/scenery/holiday/character/food/other）。

3. 列表接口支持按分类筛选
- 文件：`server/model/request/community_req.go`
- 新增：`CommunityPostListRequest.category`
- 文件：`server/service/community.go`
- 新增筛选：`category` 非 `all` 时按分类过滤。

4. 历史数据自动补齐分类
- 文件：`server/service/community.go`
- 新增 `ensurePostCategory`：读取列表/详情时若 `category` 为空，自动推断并回写数据库。

5. 返回结构补齐分类字段
- 文件：`server/model/response/community_resp.go`
- 列表和详情返回新增 `category`。
- 文件：`server/api/v1/community/community.go`
- 发布成功返回中新增 `category`。

## 验证
- `gofmt -w`：通过
- `go build .`（`perler-beads-server/server`）：通过

## 影响
- 社区分类从“纯文本标签”升级为“结构化字段 + 自动归类”，便于后续审核、推荐和运营。
