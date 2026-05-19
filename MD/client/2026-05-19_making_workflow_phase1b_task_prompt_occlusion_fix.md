# Making Workflow Phase1-B Task Prompt Occlusion Fix

日期：2026-05-19

分支：making-workflow-productization-phase1-design

## 问题

Phase1-B 第一批补验收时发现：

- 手机端单板模式高倍率选中格子后，顶部任务提示胶囊会覆盖部分格子和色号。
- 首次隐藏任务提示后，原有滑动切板状态 fallback 会接管同一顶部位置，仍然覆盖图纸。

## 根因

任务提示和滑动切板状态都复用了 `.mobile-immersive-status-hint` 顶部覆盖层。

在高倍率 detail focus 场景下：

- 当前格 / 当前色信息已经由当前色状态胶囊表达。
- 任务提示仍返回完整 action 文案。
- 任务提示隐藏后，`totalBoardCount > 1` 的被动切板状态继续显示。

因此真正需要让位的是高倍率选格时的被动状态层，而不是只隐藏某一个文案。

## 修复

本次只做 overlay-only 最小修复：

- `getSingleBoardTaskPrompt` 增加 `detailFocus` 输入。
- 当 `detailFocus=true` 且存在当前格或当前色时，任务提示返回 hidden。
- `MakingPage.tsx` 增加 `singleBoardTaskPromptDetailFocus`。
- 高倍率 detail focus 下，`showSingleBoardPassiveStatus=false`，避免滑动切板 fallback 状态接管顶部胶囊。

未修改：

- 手势模型
- layout 占高关系
- 缩放逻辑
- 拖动边界
- 复位逻辑
- 工具冻结模型
- 桌面端制作布局

## TDD 记录

### RED

新增测试：

- `single board task prompt yields to detail focus at high zoom`
- `phase1b task prompt is suppressed during detail focus`

初始失败符合预期：

- 高倍率 detail focus 下仍返回完整当前格 action 文案。
- `MakingPage.tsx` 未将 `detailFocus` 接入任务提示，也未禁止 passive fallback 状态。

### GREEN

修复后验证：

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

结果：

- 64/64 pass

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

结果：

- 15/15 pass

```powershell
cmd /c npm.cmd run build
```

目录：`perler-beads`

结果：

- exit 0
- 仅存在既有 Vite chunk size warning
- 构建主包：`assets/index-C30-YURh.js`

## MCP 验收

本地服务：

- `http://127.0.0.1:3016`

手机视口：

- `390x844x2,mobile,touch`

高倍率复现步骤：

1. 进入 `/mobile/making?test=1&occlusionFix=1`
2. 切到单板模式
3. 点击 `+` 放大到约 280%
4. 点击图纸区域选中格子

验证结果：

- `data-phase1b-task-prompt` 不存在。
- `data-phase1b-transient-toast` 不存在。
- `data-phase1b-freeze-hint` 不存在。
- `.mobile-immersive-status-hint` 数量为 0。
- 当前格 / 色号区域不再被任务提示或切板状态胶囊覆盖。

截图：

- `TEMP/phase1b_occlusion_fix_mcp_high_zoom_clean.png`

桌面与传统模式回归：

- 桌面宽屏单板模式：无 Phase1-B 手机覆盖层污染。
- 桌面传统模式：无 Phase1-B 手机覆盖层污染。

## 已知非本次问题

控制台仍有既有问题：

- `myColorsService` 云端同步 HTTP 500。
- React shorthand / non-shorthand style warning。

这些不属于本次遮挡修复范围。

## 回滚方式

```powershell
git revert <本次提交>
```

回滚影响：

- 高倍率 detail focus 下任务提示和被动切板状态会恢复到修复前行为。
- 不影响 Phase1-A、冻结模型、任务提示基础功能、手势、缩放、拖动边界和复位逻辑。

## 结论

Phase1-B task prompt occlusion fix 已完成。

建议 Phase1-B 第一批最小实现可以收口，暂不进入下一批 UI 扩展，后续继续观察真机长时间制作时是否还有新的遮挡或打扰问题。
