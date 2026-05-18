# 2026-05-15 制作页高亮与分板图纸导出

## 修改内容

- 单板制作模式下，选中颜色后的同色高亮范围按“当前板”统计和显示，传统模式仍按原区块范围显示。
- 颜色匹配优先使用珠子色号 `id`，没有 `id` 时再回退到 `hex`，避免不同色号共用相同色值时被误高亮。
- 鼠标点击和触摸点击统一走同一套单元格选择逻辑：点击其他格子直接切换，重复点击同一格才取消选择。
- 单板模式打开导出弹窗时默认启用分板导出，并使用当前现实豆板尺寸。
- 分板导出增加总览图，分板文件名包含板号和页码，例如 `perler-130x60-board2-p2of2-20260515.png`。
- 修复导出弹窗清晰度选项按钮混用 `border` 和 `borderColor` 导致的 React 样式重渲染警告。

## 测试与验证

- `cmd /c node --test TEST\single_board_interaction.test.mjs`：51/51 通过。
- `cmd /c node --test TEST\export_modal_visual_contract.test.mjs`：1/1 通过。
- `cmd /c npm run build`：通过。
- 本地 Vite：`http://127.0.0.1:3005/mobile/making?test=1`。
- 浏览器冒烟测试使用 130x60 测试图，单板模式显示 2 块板；选中颜色后显示“当前板/总计”统计。
- 无真实下载导出测试记录到 3 个文件名：
  - `perler-130x60-overview-20260515.png`
  - `perler-130x60-board1-p1of2-20260515.png`
  - `perler-130x60-board2-p2of2-20260515.png`

## 备注

- 本次没有杀掉任何 `node` 进程。
- 浏览器控制台仍有 `/api/v1/user/preferences` 代理 500，这来自本地后端未启动或测试 token 环境，不属于本次高亮和导出功能改动范围。
