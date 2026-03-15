# 2026-03-14 成品详情页作者其他成品补全

## 背景
- 图纸详情页已经补了“作者的其他作品”区块。
- 成品详情页仍只有作者主页入口，没有同类沉淀内容，社区体验不对称。

## 本次修改
- 文件：`perler-beads/src/pages/mobile/FinishedWorkDetailPage.tsx`
- 新增作者其他成品加载状态：`authorMoreWorks`、`authorMoreLoading`
- 在详情数据加载完成后，调用 `finishedWorkApi.listPublicByUser()` 拉取作者公开成品
- 过滤当前成品后，展示最多 4 个作者其他成品卡片
- 在成品图片区下方新增“作者的其他成品”区块
- 保留“查看全部”入口，跳转作者主页 `/mobile/community/user/:userId`

## 结果
- 图纸详情页和成品详情页都具备作者沉淀入口
- 用户可以在成品详情页继续浏览同一作者发布的其他成品
