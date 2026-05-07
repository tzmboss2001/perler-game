# 手机端单板沉浸式第一阶段

## 目标

- 只处理手机端单板制作模式。
- 除页面标题栏外，图纸区域不再被底部工具栏、缩放栏、状态栏、进度栏挤占布局高度。
- 工具入口、状态提示、总览等 UI 都作为覆盖层，不参与图纸区域排版。
- 工具抽屉打开时冻结底层画布拖动、缩放、点击和切板，避免误操作。

## 改动

- 新增 `getSingleBoardMobileImmersiveLayout`，集中判断手机端单板沉浸式布局状态。
- 手机端单板制作中隐藏底部导航和顶部模式切换，避免 hidden 或透明占位继续撑开布局。
- 单板移动端工具区、状态条、总览层改为 absolute overlay，不再占用 canvas container 的文档流高度。
- 沉浸式状态下 canvas wrapper 顶部偏移归零，让图纸从工作区顶部直接铺开。
- 当工具抽屉、设置面板或总览层打开时锁定底层交互，防止展开浮层时拖动画布或触发切板。
- 修复 `isSingleBoardInteractionLocked` 声明晚于 Hook 依赖数组导致的制作页白屏问题。
- 修复手机端单板底部浮层重叠：工具浮层上移到缩放条上方，`+/-` 和“适板”按钮固定最小点击宽度，避免可见但真实触点落到画布背景。

## 验证

- `cmd /c node --test TEST\single_board_interaction.test.mjs`
  - 43/43 pass。
- `cmd /c npm.cmd run build`
  - build 通过。
  - 仅存在 Vite 既有 chunk size warning，无编译错误。
- MCP 手机端模拟：390x844、iPhone Safari UA、`/mobile/making?test=1`
  - 标题栏高度 53px，标题栏下工作区为 y=53、h=791，铺满到视口底部。
  - `document.body.scrollHeight === 844`，没有底部工具栏或隐藏占位撑高页面。
  - `navCount === 0`，底部导航未渲染。
  - `modeSwitchVisible === false`，传统/单板模式切换不再占用布局。
  - 缩放从 100% 点击到 110% 后，图纸 canvas 从 300x300 变为 330x330，工作区仍保持 791px 高度。
  - 工具抽屉打开时，画布中心命中覆盖层而不是 canvas，覆盖层 `pointer-events: auto`、`touch-action: none`，底层画布交互被冻结。
  - 控制台无 React 运行时错误；测试时使用假 token 触发了颜色云同步 HTTP 500，与本次 UI 布局无关。
- MCP 按钮复测：390x844、iPhone Safari UA
  - 闭合状态下工具入口位置约 `x=202,y=752,w=52,h=28`，点击后显示“收起、自动切换、图纸、辅助”。
  - `+` 按钮位置约 `x=196,y=801,w=28,h=28`，真实触点命中 `BUTTON +`。
  - “适板”位置约 `x=228,y=801,w=42,h=28`，真实触点命中 `BUTTON 适板`。
  - “图纸”点击后出现“导出图纸 / 导出图片”弹窗。
  - “辅助”点击后出现工具设置面板。

## 后续

- 本阶段不扩展传统模式、桌面模式或第二轮工具体验细化。
- 下一步用 MCP 验证手机端单板模式实际布局：底部导航、缩放栏、状态栏不再占用图纸布局高度。
