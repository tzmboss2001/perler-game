# 2026-03-06 社区数据错位排查与修复

## 现象
- 社区卡片/详情页出现“标题是A，预览图是B，制作数据又是C”的错位。
- 用户反馈：例如“路飞草帽 48x48”预览图显示小狗，制作页数据不一致。

## 排查结论
- `community_posts` 表中历史数据存在错位：
  - `grid_width/grid_height` 与 `bead_data.width/height` 不一致
  - 典型为标题标注 16x20、48x48，但 `bead_data` 实际是 8x8
- 这不是单纯前端问题，而是数据库历史脏数据导致。

## 服务端加固
- 文件：`perler-beads-server/server/service/community.go`
- 新增发布校验：
  - `bead_data.width` 必须等于 `grid_width`
  - `bead_data.height` 必须等于 `grid_height`
  - 不一致则拒绝创建社区帖，防止新脏数据继续写入

## 数据修复操作（线上）
- 对历史错位数据执行自动下架（status=0, review_status=2）
- 对剩余正常帖子清空并重建 `preview_url/thumbnail_url`
- 修复后公开列表只保留结构一致的数据

## 验证
- `GET /api/v1/community/posts?page=1&pageSize=50` 返回正常列表（当前 3 条）
- MCP 首页复测：卡片标题、预览图、详情跳转一致
