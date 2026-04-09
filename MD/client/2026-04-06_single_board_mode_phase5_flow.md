# 2026-04-06 单板模式第五阶段：可收起总览与板级自动流转

## 本次完成
- 为单板模式新增可收起的总览头部：
  - 新增紧凑头部，显示 `单板制作 / 已完成 X/Y / 百分比`。
  - 新增 `收起总览 / 展开总览` 按钮。
  - 收起后隐藏当前板工作流卡片与整图缩略图，只保留紧凑头部与板切换 chips。
- 为单板模式新增板级自动流转：
  - 点击 `标记本板完成` 后，会自动跳到后续第一块未完成板。
  - 如果后续没有未完成板，则只标记当前板完成，不再跳转。
- 将单板总览收起状态纳入本地持久化：
  - 刷新后仍能恢复 `展开/收起` 状态。
- 保持单板模式已有能力不变：
  - 缩放滑杆、加减、适宽、下载图纸、设置
  - 当前板主预览区
  - 底部坐标与上一块/定位当前板/下一块

## 关键代码
- 文件：[MakingPage.tsx](D:/work/web/perler-beads-creator/perler-beads/src/pages/mobile/MakingPage.tsx)
- 主要新增/调整：
  - `singleBoardOverviewCollapsed` 状态
  - 本地持久化读写补齐 `singleBoardOverviewCollapsed`
  - `handleToggleBoardDone()` 自动跳到下一块未完成板
  - 单板模式总览 UI 改成“紧凑头部 + 可折叠详情”结构

## MCP 验证
- 页面：`/mobile/making`
- 验证结果：
  1. `收起总览` 可正常切换为 `展开总览`。
  2. 收起后，当前板主工作区进一步上抬，首屏明显更聚焦于当前板本体。
  3. 点击 `标记本板完成` 后：
     - 当前完成数从 `1/10` 变为 `2/10`
     - 当前板从 `板2` 自动切到 `板4`
     - 页面提示 `已完成板2，已切到板4`
  4. 刷新后：
     - 仍保持 `展开总览`（即收起状态）
     - 当前板仍恢复为 `板4`
     - 完成率仍显示 `2/10 · 20%`

## 验证截图
- [single_board_phase5_collapsed.png](D:/work/web/perler-beads-creator/TEMP/single_board_phase5_collapsed.png)
- [single_board_phase5_autonext.png](D:/work/web/perler-beads-creator/TEMP/single_board_phase5_autonext.png)
- [single_board_phase5_persist.png](D:/work/web/perler-beads-creator/TEMP/single_board_phase5_persist.png)

## 当前还差哪些项
1. 单板模式的顶部紧凑头部仍可继续收细
- 当前已经可收起，但模式切换和板 chips 仍然占据一部分高度。

2. 板级进度体系还不完整
- 还没有“全部完成率”的更强可视化呈现。
- 还没有按板恢复制作入口列表。
- 还没有“完成当前板后可选自动切下一块/停留当前板”的策略开关。

3. 单板模式的浏览区虽然已经成为主工作区，但还没做更强的单板专属控制
- 例如单板模式下更紧凑的缩放条、只显示当前板相关状态、弱化整图坐标。

## 下一步
- 第六阶段：继续收板级进度体系和单板专属控制。
- 优先项：
  1. 更显眼的总体完成率展示
  2. 单板模式顶部继续减薄
  3. 让底部辅助条更偏向“当前板制作”而不是“整图浏览”
