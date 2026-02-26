# 社区功能技术路线（Community Feature Roadmap）

> 创建时间：2026-02-25
> 状态：待实施

---

## 一、功能目标

让用户可以浏览社区作品、一键制作别人分享的图纸、发布自己的作品、点赞互动。

**杀手级功能**：看到喜欢的作品 → 一键进入制作模式，这是其他拼豆社区做不到的。

---

## 二、分阶段实施计划

### Phase 1：浏览 + 详情 + 一键制作（MVP）
### Phase 2：发布作品 + 点赞
### Phase 3：标签筛选 + 热门排序

---

## 三、Phase 1 详细设计

### 3.1 数据库表设计

#### community_posts 表（社区作品）

```sql
CREATE TABLE community_posts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_at    DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  user_id       BIGINT UNSIGNED NOT NULL COMMENT '发布者ID',
  project_id    BIGINT UNSIGNED DEFAULT NULL COMMENT '关联方案ID（可选）',
  title         VARCHAR(100) NOT NULL COMMENT '作品标题',
  description   VARCHAR(500) DEFAULT '' COMMENT '作品描述',
  thumbnail_url VARCHAR(500) NOT NULL COMMENT '缩略图URL（COS）',
  image_urls    JSON DEFAULT NULL COMMENT '成品图片列表（COS URL数组，最多9张）',
  bead_data     JSON NOT NULL COMMENT '珠子数据 {width, height, beads[]}',
  grid_width    INT DEFAULT 0 COMMENT '网格宽度',
  grid_height   INT DEFAULT 0 COMMENT '网格高度',
  bead_count    INT DEFAULT 0 COMMENT '珠子总数',
  color_count   INT DEFAULT 0 COMMENT '颜色种类数',
  difficulty    VARCHAR(20) DEFAULT 'medium' COMMENT '难度 easy/medium/hard',
  tags          VARCHAR(200) DEFAULT '' COMMENT '标签（逗号分隔，Phase 3用）',
  like_count    INT DEFAULT 0 COMMENT '点赞数（Phase 2用）',
  view_count    INT DEFAULT 0 COMMENT '浏览数',
  make_count    INT DEFAULT 0 COMMENT '制作数（一键制作计数）',
  status        TINYINT DEFAULT 1 COMMENT '0审核中 1正常 2下架',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_like_count (like_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> Phase 2 再加 `community_likes` 表，Phase 3 再加 `community_tags` 表。

### 3.2 后端 API 设计（Phase 1 只需2个接口）

#### GET /api/v1/community/posts — 社区作品列表

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| pageSize | int | 否 | 每页数量，默认20 |

**响应**：
```json
{
  "code": 0,
  "msg": "查询成功",
  "data": {
    "list": [
      {
        "id": 1,
        "title": "皮卡丘 32x32",
        "thumbnail_url": "https://cos.xxx/thumb.jpg",
        "grid_width": 32,
        "grid_height": 40,
        "color_count": 12,
        "difficulty": "easy",
        "like_count": 42,
        "view_count": 128,
        "make_count": 15,
        "user": {
          "id": 1,
          "nickname": "拼豆达人",
          "avatar": "https://cos.xxx/avatar.jpg"
        },
        "created_at": "2026-02-25T12:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**实现要点**：
- JOIN users 表获取作者信息（仅 nickname + avatar）
- 按 created_at DESC 排序（Phase 3 再加热门排序）
- 只返回 status=1 的作品
- 列表不返回 bead_data（体积大，详情页才返回）

#### GET /api/v1/community/posts/:id — 作品详情

**响应**：
```json
{
  "code": 0,
  "msg": "查询成功",
  "data": {
    "id": 1,
    "title": "皮卡丘 32x32",
    "description": "用MARD豆做的皮卡丘",
    "thumbnail_url": "https://cos.xxx/thumb.jpg",
    "image_urls": ["https://cos.xxx/photo1.jpg"],
    "bead_data": { "width": 32, "height": 40, "beads": [...] },
    "grid_width": 32,
    "grid_height": 40,
    "bead_count": 1280,
    "color_count": 12,
    "difficulty": "easy",
    "like_count": 42,
    "view_count": 129,
    "make_count": 15,
    "user": {
      "id": 1,
      "nickname": "拼豆达人",
      "avatar": "https://cos.xxx/avatar.jpg"
    },
    "created_at": "2026-02-25T12:00:00Z"
  }
}
```

**实现要点**：
- 返回完整 bead_data（前端需要用来渲染和一键制作）
- 每次访问 view_count + 1

### 3.3 后端文件清单（Phase 1）

| 文件 | 操作 | 说明 |
|------|------|------|
| `model/entity/community.go` | 新建 | CommunityPost 实体定义 |
| `model/response/community_resp.go` | 新建 | 列表项和详情的响应 DTO |
| `service/community_service.go` | 新建 | GetPosts + GetPostByID 业务逻辑 |
| `api/v1/community/community.go` | 修改 | 实现 GetPosts 和 GetPost 两个接口 |
| `initialize/gorm.go` | 修改 | 自动迁移加上 CommunityPost |

### 3.4 前端页面设计（Phase 1）

#### 页面1：社区列表页 `/mobile/community`

**布局**：
```
┌──────────────────────────┐
│ ← 社区作品               │  固定头部
├──────────────────────────┤
│ ┌──────┐  ┌──────┐      │
│ │ 图片  │  │ 图片  │      │  瀑布流双列
│ │      │  │      │      │
│ │ 标题  │  │ 标题  │      │
│ │ 32×40 │  │ 64×84 │      │  尺寸 + 色数
│ │ ♥ 42  │  │ ♥ 15  │      │  点赞数
│ └──────┘  └──────┘      │
│ ┌──────┐  ┌──────┐      │
│ │ ...   │  │ ...   │      │  滚动加载更多
│ └──────┘  └──────┘      │
├──────────────────────────┤
│  首页  创建  社区  我的   │  底部导航（社区tab高亮）
└──────────────────────────┘
```

**交互**：
- 进入页面自动加载第1页
- 滚动到底部自动加载下一页
- 点击卡片进入详情页
- 瀑布流卡片显示：缩略图 + 标题 + 尺寸 + 点赞数

#### 页面2：作品详情页 `/mobile/community/:id`

**布局**：
```
┌──────────────────────────┐
│ ← 作品详情               │  固定头部
├──────────────────────────┤
│                          │
│  [缩略图/图纸预览]        │  大图展示
│                          │
│  作品标题                 │
│  作者头像 + 昵称          │
│                          │
│  ┌────┐ ┌────┐ ┌────┐   │
│  │32×40│ │12色│ │中等│   │  信息标签
│  └────┘ └────┘ └────┘   │
│                          │
│  作品描述文字...          │
│                          │
│  ♥ 42   👁 128   🔨 15  │  互动数据
│                          │
│ ┌────────────────────┐   │
│ │   ✨ 一键开始制作    │   │  核心CTA按钮
│ └────────────────────┘   │
└──────────────────────────┘
```

**交互**：
- "一键开始制作"按钮 → 携带 bead_data 跳转到 MakingPage
- 后续 Phase 2 加点赞按钮

### 3.5 前端文件清单（Phase 1）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/services/api/communityApi.ts` | 新建 | 社区API服务（getPosts + getPostById） |
| `src/pages/mobile/CommunityPage.tsx` | 新建 | 社区列表页（瀑布流） |
| `src/pages/mobile/CommunityDetailPage.tsx` | 新建 | 作品详情页 + 一键制作 |
| `src/router/index.tsx` | 修改 | 添加 /mobile/community 和 /mobile/community/:id 路由 |
| `src/components/BottomNav.tsx` | 修改 | 底部导航添加"社区"tab |
| `src/pages/mobile/MobileLayout.tsx` | 修改 | 布局中加入社区路由 |
| `src/pages/mobile/HomePage.tsx` | 修改 | 社区卡片从"即将上线"改为可点击跳转 |

### 3.6 一键制作核心逻辑

```typescript
// CommunityDetailPage.tsx
const handleStartMaking = () => {
  // bead_data 从 API 详情接口获取
  navigate('/mobile/making', {
    state: {
      beadData: postDetail.bead_data, // {width, height, beads[]}
    },
  });

  // 同时调用 API 增加 make_count（可后台执行，不阻塞跳转）
  communityApi.incrementMakeCount(postId);
};
```

---

## 四、Phase 2 详细设计（发布 + 点赞）

### 4.1 新增数据库表

#### community_likes 表
```sql
CREATE TABLE community_likes (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  user_id    BIGINT UNSIGNED NOT NULL,
  post_id    BIGINT UNSIGNED NOT NULL,
  UNIQUE INDEX idx_user_post (user_id, post_id),
  INDEX idx_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.2 新增 API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /community/posts | 发布作品 | 需登录 |
| POST | /community/posts/:id/like | 点赞/取消点赞 | 需登录 |

### 4.3 发布作品流程

```
用户在 ProfilePage "我的方案" → 点击某个方案的"分享到社区"
  → 弹窗填写标题、描述、选难度
  → 上传缩略图到 COS
  → 调用 POST /community/posts
  → 发布成功
```

### 4.4 前端新增/修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/PublishModal.tsx` | 新建 | 发布到社区的弹窗 |
| `src/pages/mobile/ProfilePage.tsx` | 修改 | 方案卡片增加"分享到社区"按钮 |
| `src/pages/mobile/CommunityDetailPage.tsx` | 修改 | 增加点赞按钮和状态 |
| `src/services/api/communityApi.ts` | 修改 | 增加 createPost、likePost 接口 |

---

## 五、Phase 3 详细设计（标签 + 排序）

### 5.1 标签系统

预设标签（前端硬编码 + 后端存储）：
- 动漫、游戏、动物、风景、节日、人物、食物、其他

### 5.2 排序选项

- 最新发布（默认）
- 最多点赞
- 最多制作

### 5.3 API 变更

GET /community/posts 增加参数：
- `tag`: 标签筛选
- `sort`: newest / popular / most_made

---

## 六、实施顺序和工作量估算

```
Phase 1（MVP）：
  后端：entity + service + api 实现        → 约 5 个文件
  前端：2 个新页面 + API + 路由 + 导航改造  → 约 7 个文件
  预计工作量：1 次会话可完成

Phase 2（发布+点赞）：
  后端：likes 表 + 2 个新接口              → 约 4 个文件
  前端：发布弹窗 + 点赞状态                → 约 4 个文件
  预计工作量：1 次会话可完成

Phase 3（标签+排序）：
  后端：查询参数扩展                       → 约 2 个文件
  前端：筛选栏 UI                          → 约 2 个文件
  预计工作量：较小
```

---

## 七、运营初始化

Phase 1 完成后，需要运营填充初始内容：
1. 从现有模板中选取优质作品发布到社区
2. 自己制作几个作品拍照上传
3. 确保首次打开社区不是空白页

可通过直接插入数据库或做一个简单的管理接口实现。

---

## 八、验证标准

### Phase 1 验证
- [ ] 社区列表页正常加载，瀑布流展示
- [ ] 滚动分页加载正常
- [ ] 点击卡片进入详情页
- [ ] 详情页展示完整信息
- [ ] "一键开始制作"正确跳转到 MakingPage 并携带 beadData
- [ ] 底部导航"社区"tab 正常
- [ ] 首页社区卡片可点击跳转
- [ ] `npm run build` 编译通过
- [ ] 后端 `go run .` 启动正常
