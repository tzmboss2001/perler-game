# 制作流程产品化 Phase1-A 遮挡修复记录

日期：2026-05-18

## 背景

Phase1-A 验收时发现：手机端单板沉浸式在约 280% 放大并选中当前色/当前格后，顶部状态胶囊与底部工具/缩放覆盖层仍保持较强视觉存在感，会遮挡边缘格子和色号。

本次只修 Phase1-A 自身的覆盖层遮挡问题，不进入 Phase1-B。

## 根因

Phase1-A 新增的当前板状态、当前色提示和原有底部工具区都属于 overlay，但高倍率 detail-focus 场景下没有进入更弱的遮挡状态：

- 顶部状态胶囊仍展示完整板状态、进度和下一步信息。
- 当前色提示与状态信息在同一行里共同占宽。
- 底部工具区和缩放条保持常规透明度与位置。
- 这些 overlay 没有参与 layout 占高，但在高倍率选格时会长期覆盖边缘格子/色号。

## 修复方案

新增 `getSingleBoardMobileOverlayOcclusionState`，只在以下条件同时满足时进入 detail-focus：

- 手机端单板沉浸式；
- 已选中当前格/当前色；
- 当前缩放倍率达到 `DETAIL_MODE_THRESHOLD`；
- 设置面板、新手引导、总览浮层未打开。

进入 detail-focus 后：

- 顶部状态胶囊压缩为一行当前色/当前格信息；
- 隐藏常规进度、状态、下一步文本，减少顶部遮挡宽度；
- 底部工具区弱隐藏、下移、降低透明度；
- 缩放条弱隐藏、下移、降低透明度；
- 工具抽屉展开时不使用 weak-hidden，保持用户主动打开后的可操作性；
- 所有变化只影响 overlay 样式，不改变手势、缩放、拖动边界、复位逻辑和 layout 占高关系。

## 修改文件

- `perler-beads/src/utils/singleBoardInteraction.js`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `TEST/single_board_interaction.test.mjs`
- `TEST/mobile_immersive_visual_contract.test.mjs`

## 验证结果

自动化验证：

- `cmd /c node --test TEST\single_board_interaction.test.mjs`：53/53 pass
- `cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs`：9/9 pass
- `cmd /c npm.cmd run build`：通过，保留既有 chunk size warning

MCP 验收：

- 手机视口 `390x844x2`，单板沉浸式约 292% 放大后选中格子，当前色提示进入压缩弱遮挡状态。
- 工具抽屉展开后触摸拖动画布，画布坐标变化为 0，底层冻结逻辑保持有效。
- 桌面端单板模式打开正常，桌面工具区可见。
- 传统模式打开正常。
- 多板数据 `120x120` 下单板模式显示 4 块，桌面侧边栏可从板1切换到板2。

截图记录：

- `TEMP/phase1a_occlusion_fix_mobile_detail.png`
- `TEMP/phase1a_occlusion_fix_tool_drawer.png`
- `TEMP/phase1a_occlusion_fix_desktop_traditional.png`
- `TEMP/phase1a_occlusion_fix_desktop_multiboard.png`

## 已知非本次问题

- MCP 控制台仍可能出现 `myColorsService` HTTP 500，同步偏好接口属于既有后端/接口问题，不混入本次修复。
- 仍可能出现既有 React inline-style shorthand warning，本次已避免新增 detail-focus 样式里的 `border` / `borderColor` 混写。
- build 仍提示部分 chunk 大于 500 kB，属于既有构建体积 warning。

## 结论

Phase1-A overlay occlusion fix 已完成。当前修复不改变手机端单板沉浸式交互基线，建议 Phase1-A 可以进入收口状态；如继续 Phase1-B，仍应保持 overlay-only、手势不变、布局不占高的约束。
