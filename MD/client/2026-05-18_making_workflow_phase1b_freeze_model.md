# 制作流程产品化 Phase1-B 冻结模型纯函数记录

日期：2026-05-18

## 范围

本次只做 Phase1-B 的第一步：冻结模型纯函数与测试。

本次未进入帮助 UI 产品化，未新增视觉浮层，未改手势、缩放、拖动边界、复位逻辑，也未改变手机端单板沉浸式 layout。

## Freeze State / Overlay State 纯函数设计

新增：

- `getSingleBoardMobileOverlayInteractionState(input)`
- `getSingleBoardInteractionLockState(input)`

输入：

- `isSingleBoardMobileImmersive`
- `toolbarExpanded`
- `settingsOpen`
- `overviewOpen`
- `onboardingOpen`
- `helpOpen`
- `modalOpen`
- `detailFocus`

输出：

- `activeOverlay`
- `priority`
- `freezesCanvas`
- `allowCanvasDrag`
- `allowCanvasZoom`
- `allowCanvasTap`
- `allowBoardSwipe`

原则：

- 只有手机端单板沉浸式启用时，overlay freeze 才生效。
- 桌面端、传统模式、非沉浸式不会因为这些状态被锁死。
- blocking overlay 会冻结画布拖动、缩放、点格、切板。
- passive overlay 只提供视觉提示，不冻结画布。
- detail-focus 属于 passive overlay，不冻结画布。

## Overlay 优先级表

| 优先级 | activeOverlay | 是否冻结画布 | 说明 |
| --- | --- | --- | --- |
| 90 | `modal` | 是 | 导出、换色、奖励等模态层预留最高优先级 |
| 70 | `help` | 是 | Phase1-B 后续独立帮助浮层预留 |
| 70 | `onboarding` | 是 | 当前轻量帮助入口复用单板引导，打开时冻结底层画布 |
| 60 | `settings` | 是 | 辅助/设置面板打开时冻结底层画布 |
| 50 | `overview` | 是 | 总览浮层打开时冻结底层画布 |
| 40 | `toolbar` | 是 | 工具抽屉展开时冻结底层画布 |
| 10 | `detail-focus` | 否 | 高倍率当前格/当前色弱遮挡状态，不冻结 |
| 0 | `none` | 否 | 无活动 overlay |

当多个 overlay 同时为 true 时，使用最高优先级作为 `activeOverlay`，但只要最高优先级大于等于 40，画布都冻结。

## 哪些状态允许拖动

允许拖动、缩放、点格、切板：

- `activeOverlay=none`
- `activeOverlay=detail-focus`
- 非手机端单板沉浸式，即使其它 overlay flag 为 true，也不由该模型锁死

禁止拖动、缩放、点格、切板：

- `modal`
- `help`
- `onboarding`
- `settings`
- `overview`
- `toolbar`

## 接入方式

`MakingPage.tsx` 中原来的 inline 锁定表达式：

- `singleBoardMobileToolbarExpanded`
- `showSettings`
- `singleBoardMobileMiniMapExpanded`

已替换为 `getSingleBoardInteractionLockState(...)`。

同时把 `showSingleBoardOnboarding` 纳入 `onboardingOpen`，使轻量帮助入口复用单板引导时也明确冻结底层画布。

## 测试清单

自动化测试新增：

- blocking overlay 按优先级返回最高 `activeOverlay`。
- `toolbar/settings/overview/onboarding/help/modal` 会冻结画布。
- `detail-focus` 不冻结画布。
- 非沉浸式状态不被 overlay flag 锁死。
- `getSingleBoardInteractionLockState` 跟随 overlay freeze 决策。
- 源码合同测试确认 `MakingPage.tsx` 使用 `getSingleBoardInteractionLockState`，不再使用散落的 inline 锁定表达式。

执行结果：

- `cmd /c node --test TEST\single_board_interaction.test.mjs`：56/56 pass
- `cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs`：10/10 pass

## MCP 验证

环境：

- dev server：`http://127.0.0.1:3016`
- 手机视口：`390x844x2,mobile,touch`
- 页面：`/mobile/making?test=1`

验证结果：

- 工具抽屉打开后拖动画布，画布坐标变化为 `0`。
- 点击“帮助”打开单板引导后拖动画布，画布坐标变化为 `0`。
- 总览打开后拖动画布，画布坐标变化为 `0`。
- 关闭引导后点击 `+`，缩放 slider 从 `1.117` 变为 `1.217`，说明冻结状态可解除。

限制：

- 本次 MCP 截图工具调用超时，未保存截图；状态验证通过 JS 和页面快照完成。
- 控制台仍有既有 `myColorsService` HTTP 500 和 React inline-style warning，不属于本次 freeze model 范围。

## 风险边界

低风险：

- 把散落锁定表达式集中到纯函数。
- 加入源码合同测试，防止后续绕开 helper。

中风险：

- `showSingleBoardOnboarding` 现在明确参与锁定。该变化符合帮助/引导浮层打开时冻结底层画布的 Phase1-B 原则，但仍需真机观察关闭后是否恢复自然。

高风险但本次未触碰：

- 手势阈值。
- 切板模型。
- 拖动边界。
- 缩放上下限。
- 复位视图。
- 沉浸式 layout 占高。
- 帮助 UI 新浮层。

## Stop Condition

后续如果继续 Phase1-B UI，出现以下情况必须停止：

- 帮助关闭后画布仍冻结；
- 工具抽屉打开时底层还能拖动；
- detail-focus 变成 blocking overlay，导致选格后不能拖动；
- 桌面端或传统模式被 freeze helper 锁死；
- 多板切换出现误触；
- 图纸区域被帮助/工具重新挤压 layout 高度。

## 结论

Phase1-B 的冻结模型已形成可测试基线。下一步可以在该模型之上做帮助 UI / 状态提示 / 入口显式化，但必须继续先写测试，再实现最小 UI，并保持 overlay-only。
