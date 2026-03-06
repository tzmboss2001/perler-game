# 2026-03-02 社区详情页渲染与一键制作修复

## 问题
1. 社区详情页文件出现字符串未闭合，导致构建失败，页面按钮逻辑异常。
2. 详情页部分 JSX 文本标签被破坏（`</span>` 损坏），影响页面正常渲染。
3. 用户点击“一键开始制作”时出现无反应（根因是详情页脚本异常中断）。

## 修复
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- 修复内容：
  - 修正 `showConfirm` 的未闭合字符串。
  - 修正 `confirmText`、错误兜底文案、难度文案中的非法字符串。
  - 修复损坏的 JSX 结束标签（颜色数、珠子数、按钮文案等）。
  - 保留并确认：点击“一键开始制作”写入 `community_making_bead_data`，并跳转 `/mobile/making`。
  - 保留并确认：详情页显示 `palette_name / palette_brand` 色系标签。

## 验证
1. 执行：`cmd /c npm run build`
2. 结果：Vite 构建通过，无 TSX 语法错误。
3. 关键链路检查：
   - `CommunityDetailPage` 写入 key：`community_making_bead_data`
   - `MakingPage` 读取同一 key 并加载草稿数据

## 影响
- 社区详情页恢复可用，且“一键开始制作”链路恢复。
- 不改变原有业务接口协议。
