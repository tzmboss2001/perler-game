# 2026-03-14 首页与社区卡片图片可用性探测

## 问题
- 首页和社区列表里，部分帖子只有缩略图，部分帖子只有详情图。
- 直接把不存在的图片地址交给 `img` 会在控制台产生一批 404，影响本地回归判断。

## 修改
- 为列表卡片图片增加可用性探测逻辑。
- 先按 `thumbnail_url -> preview_url` 顺序探测可用地址。
- 只有确认地址可用后才渲染 `img`。
- 增加页面级缓存，避免重复探测同一张图。

## 涉及文件
- `perler-beads/src/pages/mobile/HomePage.tsx`
- `perler-beads/src/pages/mobile/CommunityPage.tsx`

## 验证
- `cmd /c npm run build` 通过
- MCP 复查首页控制台，相关社区卡片图片 404 已清除
