# 用户可见文案统一为“豆子”第一轮

日期：2026-03-10
范围：主流程页面与高频弹窗文案

## 目标
统一产品对外语言，把用户可见文案中的“珠子”优先替换为更符合拼豆产品语境的“豆子”或“拼豆”。

## 本轮修改
1. 编辑页：
- `打开珠子统计` -> `打开豆子统计`
- `珠子统计` -> `豆子统计`
- 尺寸统计中的 `xxx 颗` -> `xxx 颗豆`

2. 制作页：
- 颜色替换成功提示中的 `颗珠子` -> `颗豆子`

3. 帮助页：
- `珠子统计` -> `豆子统计`
- `不会生成珠子` -> `不会生成豆子`

4. 登录页：
- `让创意变成美丽的珠子画` -> `让创意变成好看的拼豆作品`

5. 分享/社区/模板等高频展示：
- `颗珠子` -> `颗豆`
- `珠子数量` -> `豆子数量`

6. 引导与弹窗：
- `MARD 珠子色板` -> `MARD 拼豆色板`
- `珠子颜色` -> `拼豆颜色`
- `显示珠子清单` -> `显示豆子清单`
- `颗珠子` -> `颗豆子`

## 涉及文件
- `perler-beads/src/pages/mobile/EditorPage.tsx`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/pages/mobile/HelpPage.tsx`
- `perler-beads/src/pages/mobile/LoginPage.tsx`
- `perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- `perler-beads/src/pages/mobile/TemplateDetailPage.tsx`
- `perler-beads/src/components/ShareModal.tsx`
- `perler-beads/src/components/ColorReplaceModal.tsx`
- `perler-beads/src/components/ExportModal.tsx`
- `perler-beads/src/components/OnboardingModal.tsx`
- `perler-beads/src/components/OnboardingGuide.tsx`
- `perler-beads/src/components/FeaturedCarousel.tsx`

## 说明
- 内部变量名 `bead`、`beadData`、`beadCount` 本轮不动，避免无意义的大范围技术重构。
- 3D 模块暂未处理，留到下一轮统一决定是否一起改口径。
