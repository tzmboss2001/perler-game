# 社区 Phase 2：发布作品 + 点赞

## 修改日期
2026-02-26

## 修改内容

### 后端改动（Go + Gin）
1. **新增实体 CommunityLike**（`server/model/entity/community.go`）
   - 点赞表，user_id + post_id 唯一索引
   - AutoMigrate 自动建表

2. **新增请求 DTO**（`server/model/request/community_req.go`）
   - `CreateCommunityPostRequest` 发布作品请求

3. **修改响应 DTO**（`server/model/response/community_resp.go`）
   - `CommunityPostDetail` 新增 `Liked` 字段
   - 新增 `LikeResponse` 结构体

4. **Service 层新增方法**（`server/service/community.go`）
   - `CreatePost` - 创建社区帖子，支持 base64 缩略图保存为 PNG
   - `ToggleLike` - 切换点赞状态
   - `IsLiked` - 查询是否已点赞

5. **API Handler 实现**（`server/api/v1/community/community.go`）
   - `CreatePost` - 发布作品接口
   - `LikePost` - 点赞/取消点赞接口
   - `GetPost` 修改 - 可选读取 token 返回 liked 状态
   - `tryGetUserID` - 从 Header 可选解析用户 ID

### 前端改动（React + TypeScript）
1. **communityApi.ts** - 新增 `createPost`、`likePost` 方法和类型
2. **thumbnailService.ts**（新建）- 缩略图生成 + 数据格式转换
3. **PublishModal.tsx**（新建）- 发布到社区弹窗组件
4. **ProfilePage.tsx** - 方案卡片添加"分享到社区"按钮 + 发布逻辑
5. **CommunityDetailPage.tsx** - 底部新增点赞按钮 + 状态管理

## 文件清单
### 后端
- `server/model/entity/community.go` - 追加 CommunityLike
- `server/model/request/community_req.go` - 追加 CreateCommunityPostRequest
- `server/model/response/community_resp.go` - 追加 LikeResponse + Liked 字段
- `server/service/community.go` - CreatePost/ToggleLike/IsLiked
- `server/api/v1/community/community.go` - CreatePost/LikePost handler
- `server/initialize/gorm.go` - AutoMigrate 加 CommunityLike

### 前端
- `src/services/api/communityApi.ts` - createPost/likePost
- `src/services/thumbnailService.ts` - 新建
- `src/components/PublishModal.tsx` - 新建
- `src/pages/mobile/ProfilePage.tsx` - 分享功能
- `src/pages/mobile/CommunityDetailPage.tsx` - 点赞功能
