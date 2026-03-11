# 2026-03-06 社区卡片图片降级加载修复

## 问题
- 首页/社区页卡片默认只使用 `preview_url || thumbnail_url` 作为单一 `img src`。
- 当首选链接失效（404、证书拦截、缓存异常）时，会直接显示破图占位，不会自动切备用图。

## 修复
- 文件：
  - `perler-beads/src/pages/mobile/HomePage.tsx`
  - `perler-beads/src/pages/mobile/CommunityPage.tsx`
- 新增 `CommunityCardImage` 组件：
  - 图片候选顺序：`preview_url -> thumbnail_url`
  - `onError` 自动切换到下一候选
  - 两个都失败才显示占位

## 结果
- 即使首选预览图链接失败，卡片仍可回退到缩略图，避免空白/破图。
