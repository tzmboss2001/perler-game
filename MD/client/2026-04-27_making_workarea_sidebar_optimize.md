# 2026-04-27 桌面单板制作工作区侧边栏优化

## 问题
- 桌面宽屏下已经有右侧侧边栏，但主区仍保留单板工作流卡片，继续压缩图纸工作区高度。
- 主工具条里还保留了桌面侧边栏已有的 `换色` 入口，存在重复。

## 本次修改
- 在 `perler-beads/src/utils/singleBoardInteraction.js` 新增 `getMakingDesktopSingleBoardUiFlags()`，统一描述桌面侧边栏单板模式的 UI 收缩规则。
- 在 `perler-beads/src/pages/mobile/MakingPage.tsx` 中：
  - 桌面侧边栏单板模式下不再渲染主区单板工作流卡片。
  - 右侧 `整图总览` 区新增工作流按钮：
    - `标记本板完成 / 取消完成`
    - `继续板X`
    - `展开总览 / 收起总览`
  - 主工具条中的 `换色` 在桌面侧边栏单板模式下隐藏，统一收进侧边栏。

## 验证
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
  - `33/33` 通过
- `cmd /c npm.cmd run build`
  - 通过
- MCP 桌面口径 `1536x703`
  - 存在右侧 `桌面工具区`
  - 主区已无 `当前板工作流` 卡片
  - 主工具条已无 `换色`
  - 主画布 top 约 `282.4px`
- MCP 手机口径 `390x844`
  - `window.innerWidth = 390`
  - 不再出现桌面侧边栏
  - 单板模式仍保留 `总览 / 复位 / 完成 / 图纸 / 辅助`

## 截图
- `TEMP/desktop_workarea_sidebar_optimize.png`
- `TEMP/mobile_workarea_sidebar_regression.png`
