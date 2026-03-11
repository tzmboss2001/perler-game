# 2026-03-06 社区列表预览图空白修复

## 问题
- 首页/社区列表中部分作品卡片缩略图不显示，点进详情才有图。

## 根因
- 前端列表优先使用 `thumbnail_url`，未优先使用更稳定的 `preview_url`。

## 修复
- 首页与社区页卡片展示改为优先 `preview_url`，回退 `thumbnail_url`。

## 修改文件
- `perler-beads/src/pages/mobile/HomePage.tsx`
- `perler-beads/src/pages/mobile/CommunityPage.tsx`

## 验证
- 构建通过并已发布到 `http://app-pd.shop888.vip`。
