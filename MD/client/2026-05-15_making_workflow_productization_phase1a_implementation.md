# Making Workflow Productization Phase1-A Implementation

日期：2026-05-15

## 阶段范围

本阶段只落地 Phase1-A P0 最小范围，不进入 Phase1-B / Phase1-C。

- 当前板导航与当前板位置可视化。
- 当前任务 / 状态覆盖层。
- 当前格 / 当前色轻量可读性。
- 已完成区域反馈接入现有完成状态。
- 新手帮助轻量入口，复用既有单板引导弹层。

## 明确未做

- 未改手机端单板沉浸式布局模型。
- 未改手势优先级、切板模型、拖动边界、复位逻辑。
- 未新增 layout 占高工具栏。
- 未重写导出引擎、性能逻辑或模板体系。
- 未进入 Phase1-B 的完整帮助面板与新冻结模型。

## 修改文件

- `perler-beads/src/utils/singleBoardInteraction.js`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `TEST/single_board_interaction.test.mjs`
- `TEST/mobile_immersive_visual_contract.test.mjs`

## 实现摘要

- 新增 `getSingleBoardWorkflowStatus()`，统一计算当前板标签、行列、进度、剩余块、下一步提示。
- 新增 `getSingleBoardCurrentColorSummary()`，在选中色格时输出当前色、当前板内同色数量与坐标。
- 手机端单板沉浸式顶部状态覆盖层显示当前板位置、进度、剩余块、进行中 / 已完成、下一步。
- 手机端工具 FAB 展开后新增“帮助”入口，复用既有单板模式引导。
- 设置抽屉内新增“制作帮助 / 查看”入口，同样复用既有单板模式引导。
- 补充契约测试，防止 Phase1-A 覆盖层重新参与 layout 或引入新的帮助锁定状态。

## 验证记录

- `node --test TEST\single_board_interaction.test.mjs`
- `node --test TEST\mobile_immersive_visual_contract.test.mjs`
- `npm run build`
- MCP 手机触摸视口：`390x844x2,mobile,touch`
- MCP 访问：`http://127.0.0.1:3016/mobile/making?test=1`

MCP 观察结果：

- 单板模式页面可打开，无黑屏。
- 标题栏以下最大画布层从 `top=52.8` 到 `bottom=844`，图纸区域未被 Phase1-A 工具栏重新挤压。
- `mobile-immersive-chrome-stack` 为 `position=absolute`，仍为覆盖层。
- 顶部状态可见：`板1 / 第1行 第1列 / 进度 0/1 / 剩余1块 / 下一步：完成本板`。
- 工具 FAB 可展开，包含：`自动切换 / 图纸 / 帮助 / 辅助`。
- 工具栏“帮助”可打开既有单板模式引导。
- 设置抽屉中可见“制作帮助 / 查看”入口。

截图：

- `TEMP/phase1a_mobile_single_board_overlay.png`

## 已知非本阶段问题

- 本地 MCP 中 `myColorsService` 云同步出现 HTTP 500，属于既有后端 / 云同步问题，不属于 Phase1-A 前端覆盖层改动。
- React 控制台存在 `border` / `borderColor` 混用警告，当前未纳入本阶段修复，避免混改。

## 风险

- `MakingPage.tsx` 文件体量较大，本阶段只做最小接入，后续继续改动时需要避免移动现有手势与渲染顺序。
- 当前色可读性依赖既有选中逻辑；本阶段没有改点击 / 双指 / 拖动手势。

## 回滚方式

如需回滚 Phase1-A：

```powershell
git revert <phase1a_commit_hash>
```

该提交只包含 Phase1-A 覆盖层状态、轻量帮助入口、helper 与测试，不依赖后端迁移。
