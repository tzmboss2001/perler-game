# 社区作品集成到首页

## 日期
2026-02-26

## 需求
用户希望社区作品直接展示在首页里，不需要单独的社区 Tab 页。

## 修改内容

### 1. 去掉底部导航的"社区"Tab
底部导航从4个Tab（首页、创作、社区、我的）恢复为3个Tab（首页、创作、我的）。

**修改文件：**
- `src/components/BottomNav.tsx` — 移除 UsersThree 图标导入、移除 community 导航项和路径映射、maxWidth 回到 320px
- `src/pages/mobile/MobileLayout.tsx` — 同上

### 2. 首页集成社区作品瀑布流
原首页底部的"社区入口"简易卡片替换为实际的社区作品瀑布流列表，支持滚动加载更多。

**修改文件：**
- `src/pages/mobile/HomePage.tsx` — 导入 communityApi 和相关类型、新增社区数据状态管理、加载逻辑、滚动加载更多、难度工具函数、替换社区入口为双列瀑布流布局、新增相关样式

### 3. 路由调整
移除独立的 `/mobile/community` 路由（CommunityPage），保留 `/mobile/community/:id` 详情页路由。

**修改文件：**
- `src/router/index.tsx` — 移除 CommunityPage lazy import 和 MobileLayout 内的 community 路由

## 验证
- 底部导航显示3个Tab：首页、创作、我的
- 首页滚动到下方可看到"社区作品"瀑布流，展示6个作品
- 点击作品卡片可进入详情页
- 详情页"一键开始制作"正常跳转
- 控制台无错误
