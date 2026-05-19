# Making Workflow Productization Phase1-B Task Clarity Minimal UI

日期：2026-05-19

分支：making-workflow-productization-phase1-design

## 范围

本次只实现 Phase1-B 第一批最小范围：

- 当前任务轻提示
- 状态变化短提示
- help opener 一致性

硬性边界：

- overlay-only
- 不新增大 UI
- 不改手势模型
- 不改沉浸式 layout 占高关系
- 不改缩放、拖动边界、复位逻辑
- 不进入 Phase1-C
- 不发布正式域名

## 修改文件

- `perler-beads/src/utils/singleBoardInteraction.js`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `TEST/single_board_interaction.test.mjs`
- `TEST/mobile_immersive_visual_contract.test.mjs`

## 实现说明

### 纯函数

新增任务理解相关 helper：

- `getSingleBoardTaskPrompt`
- `getSingleBoardTransientToast`

规则：

- 仅在手机端单板沉浸式条件下显示任务提示。
- blocking overlay 存在时，不显示任务提示，优先显示冻结提示。
- 状态变化短提示只在有限事件后短暂显示。
- 短提示被冻结 overlay 阻断，避免和工具抽屉、帮助弹层抢层级。

### UI

在 `MakingPage.tsx` 中接入最小覆盖层：

- `data-phase1b-task-prompt`
- `data-phase1b-transient-toast`
- 复用现有边缘覆盖层样式，保持 `position: absolute`。
- 继续使用 `pointerEvents: none`，不阻断画布点击、拖动、缩放。
- 冻结提示优先级高于短提示，短提示高于普通任务提示。

### Help opener 一致性

工具抽屉中的帮助入口打开引导时：

- 画布冻结提示显示。
- 关闭帮助后出现短提示“继续制作 / 拖动、缩放和切板已恢复”。
- 短提示自动消失后恢复当前任务提示。

## TDD 记录

### RED

新增测试后，先运行：

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

失败点：

- `getSingleBoardTaskPrompt` 未导出。

新增视觉契约测试后，先运行：

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

失败点：

- `MakingPage.tsx` 尚未接入任务提示和短提示 data attribute。

### GREEN

实现后验证：

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

结果：

- 63/63 pass

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

结果：

- 14/14 pass

```powershell
cmd /c npm.cmd run build
```

目录：`perler-beads`

结果：

- exit 0
- 仅存在 Vite chunk size warning
- 构建主包：`assets/index-Cb4l7rA_.js`

## 浏览器验证

### MCP 工具状态

本次尝试使用 MCP Chrome DevTools：

- `list_pages`
- `new_page`
- `navigate_page`
- `select_page`

结果均返回：

```text
Network.enable timed out. Increase the 'protocolTimeout' setting in launch/connect calls for a higher timeout if needed.
```

因此本次没有声称 MCP 工具层通过。为了继续完成页面行为验证，使用同一个 Chrome DevTools 远程调试端口 `127.0.0.1:9222` 进行 Playwright CDP fallback 验证，并保留截图。

### CDP 验证结果

本地服务：

- `http://127.0.0.1:3016`

手机视口：

- `390x844`

验证结果：

- 手机单板模式下，`data-phase1b-task-prompt` 可见。
- 任务提示文案：`当前任务 / 先按颜色制作本板，完成后再切下一板`。
- 任务提示位置为 `absolute`，`pointer-events: none`。
- 打开工具抽屉时，任务提示隐藏，`data-phase1b-freeze-hint` 显示。
- 工具抽屉冻结提示文案：`工具已展开 / 收起工具后可继续拖动、缩放和切板`。
- 打开帮助时，冻结提示文案：`制作帮助打开中 / 关闭帮助后可继续拖动和缩放图纸`。
- 关闭帮助后，`data-phase1b-transient-toast` 短暂显示。
- 短提示文案：`继续制作 / 拖动、缩放和切板已恢复`。
- 短提示自动消失后，恢复当前任务提示。
- 桌面宽屏传统模式不出现 Phase1-B 覆盖层。
- 桌面宽屏单板模式不出现手机沉浸式 Phase1-B 覆盖层。

截图：

- `TEMP/phase1b_task_prompt_mobile.png`
- `TEMP/phase1b_task_freeze_priority.png`
- `TEMP/phase1b_task_help_open.png`
- `TEMP/phase1b_task_help_closed_toast.png`

## 已知非本次问题

浏览器控制台仍可看到既有问题：

- `myColorsService` 云端同步 HTTP 500。
- React 关于 `border` / `borderColor` shorthand 混用的 warning。

本次不修复上述问题，避免混入 Phase1-B 任务理解范围。

## 风险与影响

风险较低：

- 新增 UI 均为覆盖层。
- 没有新增 layout 占位。
- 没有修改画布手势、缩放、拖动边界或复位逻辑。
- 覆盖层 pointer events 不阻断操作。

需要后续真机观察：

- 顶部任务提示在极小屏幕或复杂安全区下是否显得拥挤。
- 短提示频率是否会打扰连续制作节奏。

## 回滚方式

如果需要回滚本阶段：

```powershell
git revert <本阶段提交>
```

回滚影响：

- 移除 Phase1-B 当前任务轻提示。
- 移除 Phase1-B 状态变化短提示。
- 移除 help opener 的短提示一致性增强。
- 不影响 Phase1-A、冻结模型 helper、手势模型、layout、缩放、拖动边界和复位逻辑。

## 结论

Phase1-B 第一批最小实现达到预期范围：

- 当前任务提示已接入。
- 状态变化短提示已接入。
- help opener 一致性已接入。
- 自动化测试和 build 通过。
- MCP 工具层当前超时，CDP fallback 页面行为验证通过。

暂不进入 Phase1-C，暂不发布正式域名。
