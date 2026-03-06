# 2026-03-03 移动端宽度适配二轮修复

## 背景
- 用户反馈多个页面在手机端可能出现右侧截断或横向溢出。
- 本轮优先修公共层与高频页面，降低全站溢出概率。

## 修改文件
1. `perler-beads/src/pages/mobile/MobileLayout.tsx`
- `layout` 增加：`width: 100%`、`overflowX: hidden`、`boxSizing: border-box`
- `content` 增加：`width: 100%`、`minWidth: 0`、`overflowX: hidden`、`boxSizing: border-box`
- 作用：公共容器级别兜底，防止子页面把视口撑宽。

2. `perler-beads/src/pages/mobile/CommunityPage.tsx`
- 页面容器与滚动区增加 `width/minWidth/boxSizing` 约束。
- 排序栏改为可换行，避免窄屏按钮挤爆：`flexWrap: wrap`。
- 瀑布流与列增加 `minWidth: 0`，卡片增加 `width: 100%`。

3. `perler-beads/src/pages/mobile/CommunityModerationPage.tsx`
- 批量处理按钮去掉固定 `120px` 宽度。
- 操作区 `actionRow` 改为 `repeat(auto-fit, minmax(88px, 1fr))`。
- 输入框增加 `maxWidth: 100%`。
- 页面根容器增加 `overflowX: hidden` 与 `boxSizing`。

4. `perler-beads/src/pages/mobile/MakingPage.tsx`
- 设置面板改为响应式宽度：`width: min(200px, calc(100vw - 16px))`。
- 底部栏和操作区支持换行，避免极窄屏挤出。

## 验证
- `npm run build`（`perler-beads`）通过。

## 结果
- 首页 + 社区页 + 审核页 + 制作页 + 公共布局的横向溢出风险显著降低。
- 后续若要做到“每个页面100%严格适配”，还需继续覆盖 3D 系列页面和若干弹窗组件。
