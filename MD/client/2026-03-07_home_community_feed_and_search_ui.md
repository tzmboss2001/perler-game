# 2026-03-07 客户端：社区首页改为内容流 + 搜索

## 本次改动
- 文件：`perler-beads/src/pages/mobile/HomePage.tsx`
  - 社区图纸区改为四个主流内容流标签：`推荐 / 最新 / 最热 / 最多制作`。
  - 移除题材分类条（动漫/游戏/动物...）。
  - 新增搜索框：`搜索作品名 / 标签 / 作者`。
  - 搜索防抖 300ms，请求参数透传 `keyword`。
  - 修复防抖清空列表问题：仅在关键词实际变化时才重置列表。

- 文件：`perler-beads/src/pages/mobile/ProfilePage.tsx`
  - 发布成功提示细分：
    - 新建帖子：`发布成功`
    - 命中重复去重：`已更新原帖子`

- 文件：`perler-beads/src/services/api/communityApi.ts`
  - 列表参数新增 `keyword`。
  - 发布响应新增 `updated_existing` 字段定义。

## MCP 验证
- 首页社区区可见搜索框与四个内容流标签。
- 输入“笑脸”后列表缩减为命中项（`共 1 个图纸`）。
- 推荐流正常返回并渲染。
