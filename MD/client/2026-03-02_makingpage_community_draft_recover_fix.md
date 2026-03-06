# 2026-03-02 MakingPage 社区跳转数据丢失修复

## 现象
- 从社区详情点击“开始制作”后，进入 `/mobile/making` 出现空页面提示：`请先在编辑器中生成图案`。

## 根因
1. `MakingPage` 首屏会先执行登录跳转判断，`isLoggedIn` 在 `initUser()` 前默认为 `false`，已登录用户会被短暂误判。
2. 页面对社区草稿恢复依赖初始化时机，路由 `state` 丢失或首屏判定抖动时，`beadData` 可能为空。
3. 缺少空数据时的二次回填兜底。

## 修复
- 文件：`perler-beads/src/pages/mobile/MakingPage.tsx`
- 改动：
  - 增加 `authChecked`，登录跳转改为“初始化完成后再判断”。
  - 增加 `getToken()` 双保险：`!isLoggedIn && !getToken()` 才跳登录。
  - 增加空数据兜底恢复：当 `beadData` 为空时，优先回填 `initialBeadData`，否则回填 `community_making_bead_data`。

## 验证
- 执行 `cmd /c npm run build`：通过。
- 预期行为：从社区详情进入制作页时，即使发生首屏状态抖动，也能恢复到作品数据，不再落入空态提示。
