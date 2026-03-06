# 2026-03-02 历史社区作品色号兼容（按 project 回填 hex）

## 问题
- 仅靠 `colorId` 渲染历史社区作品，在色板切换后会出现颜色错误或显示异常。
- 典型场景：社区 `bead_data` 为 `C01/C51` 等旧色号，当前前端色板无法稳定映射。

## 修复思路
- 对“有关联 project_id 的社区作品”，在读取时自动从 project 的原始 bead_data 回填每个 bead 的 `hex`。
- 一旦回填成功，立即写回 `community_posts.bead_data`，后续读取直接用已补齐数据。

## 代码改动
- 文件：`perler-beads-server/server/service/community.go`
- 新增：
  - `ensurePostBeadHex(post *entity.CommunityPost) bool`
  - `lookupProjectHex(projectData map[string]interface{}, x, y int) string`
  - `isHexColor(hex string) bool`
- 接入点：
  - `GetPosts` 列表查询时先 `ensurePostBeadHex` 再生成缩略图
  - `GetPostByID` 详情查询时先 `ensurePostBeadHex` 再返回数据

## 验证
- 编译通过：`go build .`
- 服务恢复：`8012` 健康检查 `200`
- 实测：`GET /api/v1/community/posts/7` 返回 `bead_data.beads[0].hex=#EAEEF3`（历史 `C01` 已回填）

## 兼容边界
- 若社区作品没有 `project_id` 或 project 中也缺少可用颜色信息，仍只能使用兜底色（无法 100% 复原历史真色）。
