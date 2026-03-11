# 2026-03-07 社区后端：重复发布去重 + 推荐排序 + 搜索

## 本次改动

### 1) 重复发布去重（同用户同作品）
- 文件：`perler-beads-server/server/model/entity/community.go`
  - 新增字段 `content_hash`，并建立组合索引 `idx_user_content_hash`（user_id + content_hash）。
- 文件：`perler-beads-server/server/service/community.go`
  - 发布时计算 `content_hash`（基于 `bead_data`）。
  - 去重策略：
    - 优先按 `user_id + project_id` 命中已发布帖子（最稳）。
    - 其次按 `user_id + content_hash` 命中。
  - 命中后不新建，改为更新原帖（标题、描述、标签、图纸、统计元信息等），并重建预览图。
  - 每日发布限额仅对“新建帖子”生效，更新原帖不占额度。
- 文件：`perler-beads-server/server/api/v1/community/community.go`
  - 创建接口响应新增 `updated_existing` 标记，前端可区分“新发布”与“更新原帖”。

### 2) 社区搜索
- 文件：`perler-beads-server/server/model/request/community_req.go`
  - 列表请求新增 `keyword` 参数。
- 文件：`perler-beads-server/server/service/community.go`
  - 支持关键词检索：作品标题 / 标签 / 作者昵称。

### 3) 推荐流排序
- 文件：`perler-beads-server/server/service/community.go`
  - 列表 `sort` 新增 `recommended`：
    - 评分公式：`make_count*4 + like_count*3 + view_count*0.2`
    - 再按 `created_at` 倒序打破并列。

## 线上数据修复
- 回填历史 `content_hash`。
- 对同用户同项目（`user_id + project_id`）重复帖，仅保留最新一条，其余自动下架。

## MCP 验证
- 重复发布同一作品，返回：`updated_existing: true`，且列表仅保留 1 条。
- `keyword` 搜索与 `recommended` 排序接口生效。
