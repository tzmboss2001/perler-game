# 2026-03-03 社区页分类筛选参数接入（客户端）

## 背景
- 服务端新增社区 `category` 字段后，前端需要透传筛选参数并接收返回字段。

## 本次改动
1. 社区API类型补齐分类字段
- 文件：`perler-beads/src/services/api/communityApi.ts`
- `CommunityPostListItem` 新增 `category`
- `CommunityPostDetail` 新增 `category`
- `CreatePostData` 新增 `category`
- `CommunityListParams` 新增 `category`

2. 社区列表请求增加分类参数透传
- 文件：`perler-beads/src/services/api/communityApi.ts`
- `getPosts` 中新增 `searchParams.set('category', params.category)`。

3. 社区页筛选状态从 `tag` 切换为 `category`
- 文件：`perler-beads/src/pages/mobile/CommunityPage.tsx`
- 状态变量与加载参数改为 `selectedCategory`。
- 选项改为结构化 `CATEGORY_OPTIONS`（label/value）。

## 验证
- `npm run build`（`perler-beads`）：通过

## 说明
- 这次只做了分类筛选通路接入，标签体系仍保留用于展示与检索。
