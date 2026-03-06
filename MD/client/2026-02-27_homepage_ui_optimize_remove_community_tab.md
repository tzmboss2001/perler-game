# 首页UI优化 + 移除独立社区页

**日期**: 2026-02-27
**类型**: UI优化 + 页面精简
**影响文件**: 3个

## 修改内容

### 问题
1. 底部导航有4个tab（首页、创作、社区、我的），用户只要3个
2. 社区展示功能已集成在首页，不需要独立社区页
3. 首页顶部区域（header + 精选轮播 + 快速开始 + 我的方案）占了太多屏幕空间，社区作品被推到很下面

### 修改

#### 1. MobileLayout.tsx — 底部导航去掉"社区"
- 从4个tab减为3个：首页、创作、我的
- 移除 `UsersThree` 图标导入

#### 2. router/index.tsx — 移除独立社区页路由
- 删除 `CommunityPage` lazy import
- 删除 `/mobile/community` 路由
- 保留 `/mobile/community/:id` 社区详情页

#### 3. HomePage.tsx — 首页UI大幅压缩
**Header 区域**：
- 去掉装饰珠子（beadDecor）
- logo 和 subtitle 放在同一行，减小字号
- padding 从 `16px 16px 12px` 缩小到 `12px 16px 6px`

**去掉精选轮播**：
- 移除 FeaturedCarousel 组件（原来占 224px 高度）
- 移除相关 imports（FeaturedCarousel, featuredWorks, templateApi）

**快速开始 → 紧凑操作栏**：
- 从纵向大卡片（2个约150px高）改为横向紧凑按钮（3个一行，约40px高）
- 合并"我的方案"入口到操作栏第3个按钮
- 去掉独立的"我的方案"区块

**空间节省估算**：
- 原来顶部约 550px → 现在约 100px
- 多出 ~450px 给社区内容展示

### 验证
- `npm run build` 编译通过
- HomePage chunk 从 34.10 kB 减小到 26.02 kB
