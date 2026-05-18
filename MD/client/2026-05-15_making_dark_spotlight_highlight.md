# 2026-05-15 制作模式暗场聚光高亮优化

## 背景

真机测试反馈：原有同色高亮只是让格子轻微变色，不能把视觉焦点集中到被选中色号的格子上。期望效果是“黑暗中的亮光”：非目标格明显退后，目标同色格更显眼。

## 修改内容

1. 新增暗场聚光视觉参数函数：
   - 文件：`perler-beads/src/utils/singleBoardInteraction.js`
   - 函数：`getColorSpotlightVisualStyle({ dpr })`
   - 作用：统一管理当前板外遮罩、当前板内非目标遮罩、目标格提亮、目标格描边、当前点击格双描边。

2. 调整制作页底图 canvas：
   - 文件：`perler-beads/src/pages/mobile/MakingPage.tsx`
   - 当前板外区域改为更强暗场遮罩：`rgba(0, 0, 0, 0.72)`
   - 当前板内非目标格改为暗场遮罩：`rgba(0, 0, 0, 0.56)`
   - 目标格保留原色，只做轻量提亮：`rgba(255, 255, 255, 0.10)`

3. 调整制作页 overlay canvas：
   - 目标同色格增加清晰白色描边。
   - 当前点击格保留更强的双层描边。
   - 未使用阴影和模糊，避免移动端 canvas 性能风险。

4. 新增测试：
   - 文件：`TEST/single_board_interaction.test.mjs`
   - 测试：`color spotlight visual style makes non-target cells recede behind selected colors`

5. 补充设计和计划文档：
   - `docs/superpowers/specs/2026-05-15-making-dark-spotlight-highlight-design.md`
   - `docs/superpowers/plans/2026-05-15-making-dark-spotlight-highlight.md`

## 验证结果

- `cmd /c node --test TEST\single_board_interaction.test.mjs`
  - 结果：`52/52` 通过。
- `cmd /c node --test TEST\export_modal_visual_contract.test.mjs`
  - 结果：`1/1` 通过。
- `cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_clean --emptyOutDir`
  - 结果：构建通过。
  - 说明：仍有 Vite chunk size warning，是体积提示，不是错误。
- Chrome 本地页面截图：
  - `TEMP/making_dark_spotlight_highlight_after_click_20260515.png`
  - 本地测试账号仍有 `/myColors` 500 日志，属于既有测试账号/接口问题，与本次高亮无关。
- 正式站制作页截图：
  - `TEMP/formal_dark_spotlight_making_after_deploy_20260515.png`
  - 控制台无 error/warn。

## 影响范围

- 只影响制作模式屏幕上的同色高亮视觉。
- 不影响 bead 数据、colorId 匹配、换色逻辑、完成状态、自动跳下一板、overview 导出、分板图纸导出。
- 导出的 PNG 不带暗场聚光效果，仍然是干净图纸。

## 回滚方法

1. 回滚 `MakingPage.tsx` 中 color selection 的遮罩和描边调用。
2. 移除或恢复 `singleBoardInteraction.js` 中 `getColorSpotlightVisualStyle`。
3. 移除对应测试或改回旧视觉契约。
4. 重新构建并发布正式域名。
