# 2026-03-14 首页与社区卡片缩略图404清理

## 问题
- 本地 MCP 回归时，首页控制台出现多条 `*_detail.png` 的 404。
- 原因是列表卡片优先使用 `preview_url`，而部分帖子只有 `thumbnail_url`，导致先请求不存在的详情图。

## 修改
- 调整首页和社区页卡片图的候选顺序：
  - 先使用 `thumbnail_url`
  - 只有没有缩略图时才回退 `preview_url`

## 涉及文件
- `perler-beads/src/pages/mobile/HomePage.tsx`
- `perler-beads/src/pages/mobile/CommunityPage.tsx`

## 验证
- `cmd /c npm run build` 通过
- MCP 复查首页控制台，不再出现这批 `*_detail.png` 404
