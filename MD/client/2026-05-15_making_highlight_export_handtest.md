# 高亮与分板图纸导出手测验收记录

日期：2026-05-15

范围：
- 当前板同色高亮与当前点击格可见性
- 单板模式默认分页导出、overview 总览图、board1~N 分板图纸
- 手机端缩放、连点、快速切板稳定性
- 换色、自动跳下一板、完成状态受影响情况

## 测试环境

- 本机 Windows Chrome / Playwright 真实下载上下文
- 现有 Vite dev server：`http://127.0.0.1:3005`
- 未杀掉 node 进程
- 移动端覆盖方式：Chrome mobile emulation；未覆盖真实 Android/iOS 物理设备手指触控

## 结果摘要

1. 当前板高亮：通过。250% 桌面视图下，当前板范围、同色高亮和色号仍可阅读，没有出现过亮导致不可读的问题。
2. 当前点击格：基本通过。桌面端有坐标 tooltip 和当前格定位，截图可见；但在密集色号下，当前格本身的双线标记不如 tooltip 明显，可考虑后续微调。
3. 手机端缩放 / 连点：部分通过。移动仿真 250% 放大和连续点击未崩溃、无白屏；但自动化触摸没有稳定触发单格选择，需真实手机补确认。
4. 手机端快速切板：通过。移动总览面板使用 `›` / `‹` 连续切换，板 1/2 状态同步正常。
5. overview 与分页对应：通过。2 板与 6 板导出的 overview 均与 board 顺序对应。
6. 分板顺序：通过。导出顺序为从左到右、从上到下，和制作模式一致。
7. 真实下载文件：通过。Playwright `acceptDownloads` 捕获到真实 PNG 文件，文件名、数量和内容正常。
8. 6 板大图性能：通过。220x120、6 板导出共 7 个 PNG，耗时约 3.6 秒，导出后 JS heap 未上升。
9. 换色影响：通过。MARD 实际色号下，选中同色高亮后可打开换色弹窗；Perler 测试色不显示换色是因为当前换色弹窗只用 MARD `allBeadColors` 查找色号。
10. 自动跳下一板 / 完成状态：通过。高亮选中后点击完成板 1，自动切到板 2，进度变为 1/2。

## 真实下载文件

2 板导出目录：
- `TEMP/actual-downloads-20260515-2boards/perler-130x60-overview-20260515.png`
- `TEMP/actual-downloads-20260515-2boards/perler-130x60-board1-p1of2-20260515.png`
- `TEMP/actual-downloads-20260515-2boards/perler-130x60-board2-p2of2-20260515.png`

6 板导出目录：
- `TEMP/actual-downloads-20260515-6boards/perler-220x120-overview-20260515.png`
- `TEMP/actual-downloads-20260515-6boards/perler-220x120-board1-p1of6-20260515.png`
- `TEMP/actual-downloads-20260515-6boards/perler-220x120-board2-p2of6-20260515.png`
- `TEMP/actual-downloads-20260515-6boards/perler-220x120-board3-p3of6-20260515.png`
- `TEMP/actual-downloads-20260515-6boards/perler-220x120-board4-p4of6-20260515.png`
- `TEMP/actual-downloads-20260515-6boards/perler-220x120-board5-p5of6-20260515.png`
- `TEMP/actual-downloads-20260515-6boards/perler-220x120-board6-p6of6-20260515.png`

## 截图证据

- 桌面当前板高亮：`TEMP/handtest_highlight_current_board.png`
- 桌面当前格与换色入口：`TEMP/playwright_desktop_mard_selected_cell.png`
- 桌面换色弹窗：`TEMP/playwright_desktop_mard_replace_modal.png`
- 桌面完成后自动跳板：`TEMP/playwright_desktop_auto_next_after_complete.png`
- 2 板导出弹窗：`TEMP/playwright_export_modal_2boards.png`
- 2 板导出后页面：`TEMP/playwright_after_export_2boards.png`
- 6 板导出弹窗：`TEMP/playwright_export_modal_6boards.png`
- 6 板导出后页面：`TEMP/playwright_after_export_6boards.png`
- 移动端 250% 缩放连点：`TEMP/playwright_mobile_mard_zoom_tap_switch.png`
- 移动端总览箭头切板：`TEMP/playwright_mobile_overview_arrow_switch.png`

## 注意事项

- DevTools 控制的浏览器上下文没有落盘下载文件，已改用 Playwright `acceptDownloads` 做真实文件验证。
- 控制台仍有测试 token 触发的 `/api/v1/user/preferences` 500 与 `myColorsService` 云同步失败警告，属于本地假登录/后端代理环境问题；未出现本次修复过的 React `borderColor` 样式冲突警告。
- 9 板大图使用 localStorage 注入测试数据时超过浏览器配额，属于测试注入方式限制；已用 6 板大图覆盖性能验收。

## UI 微调建议

- 当前格标记可略加强：在密集色号下，当前格主要靠 tooltip 识别，建议后续把当前格外描边再加粗一点，或增加短暂脉冲。
- 当前板同色高亮暂不建议继续加亮，现有亮度阅读性可接受。
- 移动端单格触摸选择建议真实手机再确认；如果真机也觉得不明显，再单独优化触摸命中和当前格反馈。
