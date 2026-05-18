# 单板制作模式双指缩小时画面偏移修复记录

## 背景

用户在安卓真机单板制作模式下测试双指缩放，发现从高倍率缩小时，画面会向侧边或底部偏移，缩到接近 100% 时更明显。

## 根因判断

这是前端移动端单板制作模式的缩放与定位问题，不涉及后端、接口、数据或图片生成结果。

主要原因：

1. `getLiveStageDisplayScale` 之前强制显示缩放不小于 1。当 `targetScale < committedRenderScale` 时，视觉缩放没有跟随目标比例缩小，但 translate 已按目标比例计算，导致视觉位置漂移。
2. 单板沉浸模式下 `immersiveVerticalSlack` 在缩小时仍允许额外纵向余量，可能让画面停在偏底部位置。

## 修改内容

1. `perler-beads/src/utils/singleBoardInteraction.js`
   - `getLiveStageDisplayScale` 允许 `targetScale / committedRenderScale` 小于 1。
   - `clampMakingStageTranslate` 新增 `allowImmersiveVerticalSlack` 参数，支持临时关闭沉浸模式纵向 slack。
2. `perler-beads/src/pages/mobile/MakingPage.tsx`
   - 扩展 `commitTranslate` 选项，把 `ignoreImmersivePanSlack` 传给 `clampTranslate`。
   - 双指缩小时传入 `ignoreImmersivePanSlack: true`，避免缩小时画面被保留在异常下偏位置。
3. `TEST/single_board_interaction.test.mjs`
   - 增加 `targetScale=1`、`committedRenderScale=2` 时 display scale 返回 `0.5` 的测试。
   - 增加单板沉浸模式缩小时关闭 vertical slack 的 clamp 测试。

## 验证记录

1. RED 阶段：
   - `cmd /c node --test TEST\single_board_interaction.test.mjs`
   - 新增两个测试按预期失败：
     - display scale 返回 `1` 而不是 `0.5`。
     - clamp 后 `y` 返回 `118.65` 而不是 `0`。
2. GREEN 阶段：
   - `cmd /c node --test TEST\single_board_interaction.test.mjs`
   - 53 个用例通过。
3. 构建：
   - `cmd /c npm run build -- --outDir ..\TEMP\single_board_pinch_fix_build --emptyOutDir`
   - 构建通过，仅保留既有大 chunk warning。
4. MCP 移动端验证：
   - 环境：`http://127.0.0.1:3005/mobile/making?test=1&pinchFix=1`
   - 模拟：390x844、deviceScaleFactor 2、Android mobile/touch UA。
   - 操作：单板模式从 580% 合成双指缩小到 100%。
   - 结果：画面没有被压到工具条附近，主画布和覆盖层保持同框。

## 截图记录

- 缩放前：`TEMP/single_board_pinch_fix_mobile_before_580.png`
- 缩放后：`TEMP/single_board_pinch_fix_mobile_after_100.png`
- 桌面视口辅助截图：
  - `TEMP/single_board_pinch_fix_before_580.png`
  - `TEMP/single_board_pinch_fix_after_116.png`

## 已知验证噪音

- 本地开发环境存在 `myColorsService` 云端同步 HTTP 500 warning，和本次缩放修复无关。
- MCP 使用脚本合成 TouchEvent 时，Chrome 会输出 `Unable to preventDefault inside passive event listener invocation.`，属于验证手段触发的浏览器提示，不是本次修复逻辑的运行异常。

## 影响范围

- 影响单板制作模式移动端双指缩小时的视觉缩放和纵向 clamp。
- 不改手势优先级。
- 不改切板模型。
- 不改拖动边界和复位逻辑的大结构。
- 不影响高亮、色号文字层、网格线、底图对齐。
- 不影响自动跳下一板和分板导出。

## 回滚方法

1. 还原以下文件中本次相关修改：
   - `perler-beads/src/utils/singleBoardInteraction.js`
   - `perler-beads/src/pages/mobile/MakingPage.tsx`
   - `TEST/single_board_interaction.test.mjs`
2. 删除本记录文件。
3. 重新运行单板交互测试和前端构建。
