# 制作流程体验产品化 Phase1 实现计划记录

## 当前阶段

本记录对应 `docs/superpowers/plans/2026-05-15-making-workflow-productization-phase1.md`。

当前仍处于实现计划阶段，未改业务代码、未 build、未发布。

## 阶段拆分

### Phase1-A：当前板状态与当前色可读性

- 风险等级：中。
- 主要文件：
  - `perler-beads/src/utils/singleBoardInteraction.js`
  - `TEST/single_board_interaction.test.mjs`
  - `TEST/mobile_immersive_visual_contract.test.mjs`
  - `perler-beads/src/pages/mobile/MakingPage.tsx`
- 目标：
  - 增加当前板、行列位置、进度、剩余、下一步动作的只读状态。
  - 增加当前格、当前色号、本板同色数量、整体同色数量的边缘化显示。
- 不改：
  - 手势阈值。
  - 切板模型。
  - 拖动边界。
  - 色号 canvas 同步机制。

### Phase1-B：制作帮助入口与冻结模型

- 风险等级：中。
- 主要文件：
  - `perler-beads/src/utils/singleBoardInteraction.js`
  - `TEST/single_board_interaction.test.mjs`
  - `TEST/mobile_immersive_visual_contract.test.mjs`
  - `perler-beads/src/pages/mobile/MakingPage.tsx`
- 目标：
  - 工具抽屉内增加制作帮助入口。
  - 帮助面板打开时纳入 `isSingleBoardInteractionLocked`，冻结底层画布。
- 不改：
  - 现有工具抽屉层级。
  - 现有总览冻结逻辑。
  - 现有画布拖动和缩放算法。

### Phase1-C：导出前说明与验证

- 风险等级：低到中。
- 主要文件：
  - `perler-beads/src/components/ExportModal.tsx`
  - `perler-beads/src/pages/mobile/MakingPage.tsx`
  - `TEST/mobile_immersive_visual_contract.test.mjs`
  - `MD/client/2026-05-15_making_workflow_productization_phase1_implementation.md`
- 目标：
  - 增加导出前确认说明。
  - 展示尺寸、板数、分页、当前制作上下文、打印建议。
- 不改：
  - 导出渲染逻辑。
  - 下载逻辑。
  - ZIP 或大图内存策略。

## 第一批真正实现范围

只做 P0 和低风险说明：

- 当前板状态覆盖层。
- 当前格/当前色可读性。
- 工具抽屉内帮助入口。
- 帮助面板冻结底层画布。
- 导出前说明文案。

## 明确延期

- 横屏沉浸式。
- 多板沉浸式扩展。
- 手势阈值调整。
- 切板模型调整。
- 已完成区域 canvas 淡化。
- 进度云同步。
- 库存扣减联动。
- 大图导出性能优化。
- 模板与内容生态。

## MCP 验收重点

- 手机端单板沉浸式图纸区域仍铺满标题栏以下空间。
- 新覆盖层不占 layout 高度。
- 工具抽屉、帮助面板、总览打开时底层画布冻结。
- 100%、150%、200% 低中倍率微移正常。
- 300%+ 自由拖动正常。
- 多板切换不误触。
- 导出弹窗说明显示，但导出文件顺序和逻辑不变。
- 桌面端单板和传统模式不回归。

## 回滚策略

- Phase1-A 回滚当前板状态和当前色可读性。
- Phase1-B 回滚帮助入口和冻结扩展。
- Phase1-C 回滚导出前说明。
- 若出现沉浸式 layout、冻结、拖动、切板、色号渲染回归，优先回滚对应小提交，不回滚已稳定的沉浸式 Phase1/Phase2 基线。

