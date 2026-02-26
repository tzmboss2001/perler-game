# 社区功能 Phase 1 实现

## 修改时间
2026-02-25

## 修改内容

### 后端（5个文件）

1. **model/entity/community.go** [新建]
   - CommunityPost 实体定义，含所有字段（title/thumbnail/beadData/stats等）
   - GORM 自动迁移

2. **model/response/community_resp.go** [新建]
   - CommunityPostAuthor - 作者信息 DTO
   - CommunityPostListItem - 列表项 DTO（不含 bead_data）
   - CommunityPostDetail - 详情 DTO（含 bead_data）

3. **model/request/community_req.go** [新建]
   - CommunityPostListRequest - 列表分页请求参数

4. **service/community.go** [新建]
   - GetPosts: 分页列表，JOIN users 获取作者信息，只返回 status=1
   - GetPostByID: 详情，含 bead_data，view_count+1
   - IncrementMakeCount: 制作次数+1
   - getUserMap: 批量获取用户信息辅助函数

5. **api/v1/community/community.go** [修改]
   - 实现 GetPosts、GetPost、MakePost 三个接口
   - CreatePost/LikePost/Comment 保留 TODO（Phase 2）

6. **router/community.go** [修改]
   - 公开路由增加 POST posts/:id/make

7. **initialize/gorm.go** [修改]
   - AutoMigrate 增加 CommunityPost

### 前端（7个文件）

1. **services/api/communityApi.ts** [新建]
   - getPosts: 列表分页
   - getPostById: 详情
   - incrementMakeCount: 增加制作次数（静默失败）

2. **pages/mobile/CommunityPage.tsx** [新建]
   - 社区列表页，瀑布流双列布局
   - 窗口滚动加载更多
   - 作品卡片：缩略图+标题+尺寸+色数+难度+点赞+浏览
   - 空状态提示

3. **pages/mobile/CommunityDetailPage.tsx** [新建]
   - 作品详情页
   - 展示缩略图、标题、作者、标签、描述、互动数据
   - 底部"一键开始制作"CTA按钮
   - 携带 bead_data 跳转到 MakingPage

4. **router/index.tsx** [修改]
   - MobileLayout 内添加 /mobile/community 路由
   - 独立添加 /mobile/community/:id 路由

5. **pages/mobile/MobileLayout.tsx** [修改]
   - 底部导航增加"社区" tab（UsersThree 图标，橙色）
   - navInner maxWidth 从 320px 扩大到 400px

6. **components/BottomNav.tsx** [修改]
   - 同步增加"社区" tab 和路径映射
   - maxWidth 同步调整

7. **pages/mobile/HomePage.tsx** [修改]
   - 社区卡片从"即将上线"改为可点击
   - "查看全部 →" 按钮跳转社区
   - 移除 pointerEvents/opacity 限制

## API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/v1/community/posts | 社区作品列表 | 公开 |
| GET | /api/v1/community/posts/:id | 作品详情 | 公开 |
| POST | /api/v1/community/posts/:id/make | 增加制作次数 | 公开 |
