## 变更主题

手机端单板制作模式首屏 UI 收紧，把次级工具收进统一入口，扩大图纸工作区。

## 主要修改

- 首屏主工具区只保留：
  - `总览`
  - `复位`
  - `完成`
  - `工具`
- 删除原来单独占一行的手机端单板导航按钮区，减少首屏高度占用。
- `图纸 / 辅助 / 自动切换 / 换色 / 继续未完成` 收进 `工具` 面板。
- 顶部单板状态区保留当前板进度和下一板提示，但把 `自动切换` 改成更轻的状态提示文案。
- `工具` 面板标题在手机端单板模式下显示为 `工具`，其它场景仍保留 `设置`。
- `换色` 只在当前选中颜色时出现在 `工具` 面板内，不再在首屏单独占位。

## 影响范围

- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/utils/singleBoardInteraction.js`
- `TEST/single_board_interaction.test.mjs`

## 验证

- `cmd /c node --test TEST\single_board_interaction.test.mjs`
  - 结果：`34/34` 通过
- `cmd /c npm.cmd run build`
  - 结果：通过
- MCP 本地手机口径验证
  - 首屏仅保留 `总览 / 复位 / 完成 / 工具 / 缩放`
  - `工具` 打开后可见 `图纸 / 辅助 / 自动切换`
  - 图纸工作区主画布顶部约 `348px`，较旧布局少一整行导航占位
  - 截图：`TEMP/mobile_single_board_ui_compact.png`
- MCP 本地桌面口径回归
  - `桌面工具区` 仍正常显示
  - 桌面侧边栏中的 `整图总览 / 常用工具 / 自动切下一板` 未被手机端改动破坏
  - 控制台仅保留既有 `border / borderColor` 混用告警，本轮未新增功能性报错

## 备注

- 本次只收手机端单板模式，不改变桌面侧边栏逻辑。
