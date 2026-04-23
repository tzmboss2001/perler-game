## 问题

- 桌面浏览器打开制作模式时，单板模式顶部与底部信息区沿用移动端堆叠布局，导致中间工作区被明显挤压。
- 实际表现为桌面端屏幕很宽，但画布可视高度不足，制作区显得过矮。

## 本次修改

- 为单板模式补充桌面/手机布局判定 helper，避免直接在页面里散落桌面分支判断。
- 给桌面端单板模式新增更高的画布最小高度策略，让中间制作区优先吃高度。
- 将桌面端顶部信息区改成更紧凑的双层布局：
  - 隐藏桌面端单板模式下的顶部进度条
  - 压缩状态区、快捷控制区、未完成板块区的尺寸与间距
  - 将“当前板工作流”和“整图总览”改成横向紧凑卡片
- 压缩桌面端单板模式下的板导航与底部任务条按钮尺寸，减少上下留白。
- 手机端单板模式保持原有布局，不走桌面压缩样式。
- 第二轮继续压缩桌面端单板专属顶部占高：
  - 将 `继续上次制作 / 自动切下一板 / 收起总览` 合并回单板头部
  - 移除桌面端单板独立的快捷行和未完成板块行
  - 收紧当前板工作流卡片、总览卡片、板导航芯片和按钮尺寸
  - 保留传统模式原布局，不修改传统模式工作区结构

## 涉及文件

- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/utils/singleBoardInteraction.js`
- `TEST/single_board_interaction.test.mjs`

## 验证

- `node --test TEST\\single_board_interaction.test.mjs`
  - 结果：`30/30` 通过
- `npm.cmd run build`
  - 结果：通过
- MCP 页面级验证
  - 桌面口径 `1540x754` 下，对比结果如下：
    - 传统模式制作区可见高度约 `437px`
    - 单板模式第二轮压缩后制作区可见高度约 `467px`
  - 单板模式已不再比传统模式更矮，之前单板模式仅约 `354px`
  - 手机口径回归正常，`总览 / 复位 / 完成 / 缩放条` 仍按原移动端布局显示
  - 当前控制台仅残留一个旧的 `border / borderColor` 混用告警，与本次布局压缩无直接关系

## 产出截图

- `TEMP/desktop_single_board_compact_layout.png`
- `TEMP/desktop_single_board_compact_layout_fresh.png`
- `TEMP/mobile_single_board_regression_after_desktop_compact.png`
