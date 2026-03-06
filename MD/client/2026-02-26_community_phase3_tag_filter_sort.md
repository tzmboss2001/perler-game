# 社区 Phase 3：标签筛选 + 热门排序

**日期**: 2026-02-26
**类型**: 新功能

## 改动概述

为社区功能添加标签筛选和排序能力，让用户更方便地发现感兴趣的作品。

## 后端改动（3个文件）

### 1. `perler-beads-server/server/model/request/community_req.go`
- `CommunityPostListRequest` 新增 `Tag` 和 `Sort` 字段
- `CreateCommunityPostRequest` 新增 `Tags` 字段

### 2. `perler-beads-server/server/model/response/community_resp.go`
- `CommunityPostListItem` 新增 `Tags` 字段
- `CommunityPostDetail` 新增 `Tags` 字段

### 3. `perler-beads-server/server/service/community.go`
- `GetPosts`：支持 `tag` 参数做 LIKE 筛选，支持 `sort` 参数切换排序（newest/popular/most_made）
- `CreatePost`：保存 `req.Tags` 到 `post.Tags`
- `GetPostByID`：返回详情时包含 `Tags` 字段

## 前端改动（4个文件）

### 1. `perler-beads/src/services/api/communityApi.ts`
- `CommunityListParams` 新增 `tag` 和 `sort` 参数
- `CommunityPostListItem`、`CommunityPostDetail` 新增 `tags` 字段
- `CreatePostData` 新增 `tags` 字段
- `getPosts` 方法将 `tag`/`sort` 加入 URLSearchParams

### 2. `perler-beads/src/pages/mobile/HomePage.tsx`（重点修改）
- 将标签筛选+排序功能集成到首页的"社区作品"区域（而非独立 CommunityPage）
- 新增标签筛选栏（水平滚动）：全部/动漫/游戏/动物/风景/节日/人物/食物/其他
- 新增排序切换按钮：最新/最热/最多制作
- 切换标签或排序时重置页码并重新加载
- 滚动加载时保持当前筛选参数
- 首页原有功能（精选作品、快速开始、我的方案、底部导航）全部保留

### 3. `perler-beads/src/pages/mobile/CommunityPage.tsx`
- 同步添加了标签筛选+排序功能（作为独立社区页面备用）

### 4. `perler-beads/src/components/PublishModal.tsx`
- 新增标签多选区域
- 选中标签以逗号拼接传给 API
- 打开弹窗时重置标签选择

### 5. `perler-beads/src/pages/mobile/ProfilePage.tsx`
- 更新 `handlePublish` 签名以接收 `tags` 参数
- `postData` 中传递 `tags` 字段

## 验证结果

- `go build .` 后端编译通过
- `npm run build` 前端构建通过
- API 支持 `?tag=动漫&sort=popular` 查询参数
- Chrome MCP 端到端测试通过：
  - 首页原有功能（精选作品、快速开始、我的方案）完整保留
  - 底部导航正常显示
  - 标签筛选栏可水平滚动，点击切换正常
  - 排序切换正常，高亮状态正确
  - API 请求参数传递正确（tag/sort）
  - 无控制台报错
