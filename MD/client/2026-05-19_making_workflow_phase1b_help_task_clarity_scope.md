# Phase1-B 帮助体验与任务理解最小增强 Scope

## 当前基线

Phase1-B freeze model helper、overlay 优先级、freeze hint minimal UI 已收口。当前可继续推进的方向不是扩大 UI，而是在不破坏手机端单板沉浸式基线的前提下，让用户更容易理解当前制作任务。

当前必须保持：

- 不新增大 UI。
- 不做重帮助系统。
- 不强化当前格大浮层。
- 继续 overlay-only。
- 不碰手势模型、layout 占高、缩放、拖动边界、复位逻辑。
- 不影响桌面端、传统模式、多板非沉浸式。

## Phase1-B 下一步目标

本阶段目标是“任务理解最小增强”，不是重新设计制作页。

用户需要更清楚：

- 当前做哪块板。
- 当前该做什么。
- 当前颜色 / 当前格意味着什么。
- 去哪里看帮助。
- 状态变化发生了什么，例如当前颜色完成、当前板完成、已切换下一板。

## 推荐方案

采用方案 A：任务理解最小增强。

实现方向：

- 当前板状态继续保留顶部轻胶囊。
- 当前任务提示改为统一纯函数文案。
- 帮助入口继续统一 opener。
- 当前颜色 / 当前格只做轻量说明。
- 状态变化短提示只短暂出现后淡出，不长期常驻。

## 不做事项

本阶段明确不做：

- 不新增底部常驻工具栏。
- 不新增顶部常驻状态栏。
- 不新增多页帮助教程。
- 不新增手势教学动画。
- 不新增当前格大型聚焦卡片。
- 不新增复杂帮助中心入口。
- 不修改切板阈值。
- 不修改缩放条行为。
- 不修改 canvas 拖动边界。
- 不修改复位视图。
- 不修改生成、导出、色板、后端 API。

## 任务提示纯函数规则

建议新增或扩展纯函数，集中输出当前任务提示文案。函数不直接依赖 React state，不读写 DOM，不触发副作用。

建议输入：

```ts
type SingleBoardTaskPromptInput = {
  isSingleBoardMode: boolean;
  isMobileImmersive: boolean;
  activeBoardIndex: number;
  totalBoardCount: number;
  activeBoardRow?: number;
  activeBoardCol?: number;
  activeBoardCompleted: boolean;
  activeBoardDoneCount: number;
  activeBoardTotalCount: number;
  remainingBoardCount: number;
  selectedCell?: {
    row: number;
    col: number;
    colorId?: string;
  } | null;
  selectedColor?: {
    id: string;
    boardRemainingCount: number;
  } | null;
  nextPendingBoardIndex?: number | null;
};
```

建议输出：

```ts
type SingleBoardTaskPrompt = {
  visible: boolean;
  level: "passive" | "action" | "complete";
  title: string;
  text: string;
};
```

规则优先级：

1. 非手机端单板沉浸式：不输出新增提示，只返回 `visible=false`。
2. 当前板已完成且存在下一块未完成板：提示 `本板已完成`，说明可切换到下一板。
3. 当前板已完成且无下一块未完成板：提示 `全部完成`，说明可以导出或检查作品。
4. 已选中格子：提示当前格坐标和色号，例如 `当前格：第 5 行第 8 列 · C29`。
5. 已选中颜色：提示当前色在本板剩余数量，例如 `当前色 C29，本板剩余 12 颗`。
6. 无选中格 / 色：提示当前主任务，例如 `先按颜色制作本板，完成后再切下一板`。

文案原则：

- 每条不超过两行。
- 不承诺任何新交互能力，只解释现有规则。
- 不使用中心浮层。
- 不使用会长期遮挡图纸核心区域的卡片。
- 不出现“必须”“强制”等压迫性文案，避免增加制作焦虑。

## 状态变化短提示规则

状态变化短提示用于解释刚发生的结果，不是常驻信息。

适用场景：

- 当前颜色完成。
- 当前板完成。
- 已切换下一板。
- 已复位视图。
- 已打开帮助。
- 已关闭帮助。

不适用场景：

- 每次拖动画布。
- 每次缩放倍率变化。
- 每次点格子。
- 每次工具抽屉展开 / 收起。此类已有 freeze hint 或按钮状态，不重复提示。

建议输出结构：

```ts
type SingleBoardTransientToast = {
  visible: boolean;
  eventType:
    | "color-completed"
    | "board-completed"
    | "board-switched"
    | "view-reset"
    | "help-opened"
    | "help-closed";
  title: string;
  text: string;
  durationMs: number;
};
```

出现规则：

- 默认显示 `1400ms` 到 `1800ms`。
- 使用 `opacity` 和 `transform` 过渡，不改变宽高和 layout。
- 只出现在顶边或底边安全区域，不在画布中心漂浮。
- `pointer-events: none`。
- 如果 freeze hint 正在显示，短提示不显示，避免信息叠加。
- 如果帮助 / 设置 / 总览 overlay 正在打开，短提示不显示或延后到关闭后显示。
- 连续事件发生时只保留最新一条，不排队播放多条。

建议首批文案：

- 当前颜色完成：`当前颜色完成` / `可以继续下一个颜色或检查漏格`
- 当前板完成：`本板已完成` / `可以切换下一板继续制作`
- 已切换下一板：`已切换到板 N` / `继续按当前板制作`
- 已复位视图：`视图已复位` / `回到适合当前板的查看位置`
- 已打开帮助：`制作帮助已打开` / `关闭后可继续操作图纸`
- 已关闭帮助：`继续制作` / `拖动、缩放和切板已恢复`

## Overlay 文案层级与出现时机

文案层级从高到低：

1. 阻断型 freeze hint：解释为什么不能拖动 / 缩放。
2. 状态变化短提示：解释刚刚发生了什么。
3. 当前任务提示：说明现在该做什么。
4. 当前板状态：说明当前在哪块板。
5. 当前色 / 当前格轻提示：说明当前选中对象。

冲突规则：

- freeze hint 优先级最高。
- freeze hint 显示时，短提示和普通任务提示不抢前景。
- 当前格 detail focus 时，当前色 / 当前格信息可以保留，但必须继续服从 Phase1-A 遮挡保护。
- 工具抽屉打开时，任务提示不扩展成新卡片。
- 设置抽屉打开时，任务提示不新增第二层说明。

## 帮助入口一致性规则

当前继续保留一个 opener：

- 工具抽屉 `帮助`。
- 设置抽屉 `制作帮助 / 查看`。

一致性要求：

- 两个入口调用同一个打开逻辑。
- 打开帮助前关闭工具抽屉和设置抽屉。
- 打开帮助后底层画布冻结。
- 关闭帮助后恢复拖动、缩放、切板。
- 不新增第三个常驻帮助按钮。

## MCP 风险评估

必须验证：

- 手机端单板沉浸式进入后图纸仍铺满标题栏以下空间。
- 新增任务提示不参与 layout 占高。
- 任务提示不遮挡当前格、色号、缩放条、工具按钮。
- 当前格 detail focus 时仍触发 Phase1-A 弱隐藏策略。
- freeze hint 显示时短提示不会叠加。
- 工具抽屉打开时底层画布冻结。
- 设置抽屉打开时底层画布冻结。
- 帮助打开时底层画布冻结。
- 关闭帮助后缩放 / 拖动恢复。
- 桌面端不出现手机端任务短提示。
- 传统模式不出现单板沉浸式任务短提示。
- 多板切换不误触。

建议 MCP 验收场景：

1. 手机端单板模式，100% 选择格子，观察当前任务提示。
2. 手机端单板模式，280% 选择边缘格子，观察是否遮挡色号。
3. 工具抽屉打开，确认 freeze hint 优先，任务提示不抢前景。
4. 设置抽屉打开，确认 freeze hint 优先，任务提示不叠加。
5. 帮助打开和关闭，确认冻结与恢复。
6. 完成本板，观察短提示自动淡出。
7. 切换下一板，观察短提示自动淡出。
8. 桌面宽屏切换传统模式，确认无手机提示污染。

## 文件范围建议

允许修改：

- `perler-beads/src/utils/singleBoardInteraction.js`
- `TEST/single_board_interaction.test.mjs`
- `TEST/mobile_immersive_visual_contract.test.mjs`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `MD/client/*phase1b*.md`

暂不修改：

- 后端 API。
- 色板数据。
- 生成质量相关代码。
- 导出引擎。
- 发布脚本。
- 模板 / 社区页面。

## 提交策略

后续实现建议拆成两到三个小提交：

1. 任务提示纯函数与测试。
2. 状态变化短提示规则与测试。
3. 最小 UI 接入、MCP 验收记录。

每个提交必须可独立回滚。

## Stop Condition

出现以下情况立即停止，不继续扩大实现：

- 任何新增 UI 重新参与 layout 占高。
- 图纸区域不再铺满标题栏以下空间。
- 当前格 / 色号被长期遮挡。
- freeze hint、任务提示、短提示三者叠在一起。
- 关闭 overlay 后画布仍冻结。
- 100% 到 200% 微移失效。
- 300%+ 自由拖动失效。
- 多板切换误触。
- 桌面端或传统模式出现黑屏、不可操作或手机提示污染。

## 当前结论

Phase1-B 下一步可以进入“任务理解最小增强”的实现计划阶段，但仍必须先写实现计划，不直接写业务代码。

建议第一批实现只做：

- 当前任务提示纯函数。
- 状态变化短提示纯函数。
- 帮助入口一致性契约测试。
- 最小 overlay 接入。

不建议本轮进入大帮助系统、复杂教学、当前格强浮层或手势规则调整。
