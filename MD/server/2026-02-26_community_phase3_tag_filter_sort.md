# 社区 Phase 3：标签筛选 + 热门排序（后端）

**日期**: 2026-02-26
**类型**: 新功能

## 改动概述

后端支持社区作品的标签筛选和多种排序方式。

## 改动文件

### 1. `model/request/community_req.go`
- `CommunityPostListRequest` 新增 `Tag string` (form:"tag") 和 `Sort string` (form:"sort")
- `CreateCommunityPostRequest` 新增 `Tags string` (json:"tags")

### 2. `model/response/community_resp.go`
- `CommunityPostListItem` 新增 `Tags string` (json:"tags")
- `CommunityPostDetail` 新增 `Tags string` (json:"tags")

### 3. `service/community.go`
- `GetPosts`: Tag 非空时添加 `WHERE tags LIKE '%tag%'`；Sort 支持 popular(点赞数降序) / most_made(制作数降序) / 默认(时间降序)
- `CreatePost`: 保存 Tags 字段
- `GetPostByID`: 返回 Tags 字段

## API 使用

```
GET /api/v1/community/posts?tag=动漫&sort=popular&page=1&pageSize=20
```

| 参数 | 说明 |
|------|------|
| tag | 标签筛选（可选，单个标签） |
| sort | 排序方式：newest(默认) / popular / most_made |
