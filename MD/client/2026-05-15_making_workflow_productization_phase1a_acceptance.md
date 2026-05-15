# Making Workflow Productization Phase1-A Acceptance

日期：2026-05-15

基线提交：

- `a3d373e4 feat: add making workflow phase1a overlay`

本记录只做 Phase1-A 验收收口，不进入 Phase1-B，不修改业务代码。

## 验收环境

- worktree：`C:\Users\tzm\.config\superpowers\worktrees\perler-beads-creator\making-workflow-productization-phase1-design`
- dev server：`http://127.0.0.1:3016`
- MCP 手机视口：`390x844x2,mobile,touch`
- MCP 桌面视口：`1280x900x1`

## 验收结果

### 1. 覆盖层是否遮挡格子编号 / 色号

结论：部分遮挡，需要 Phase1-A follow-up。

观察：

- 在 100% 单板视图下，图纸主体位于中部，顶部状态与底部工具覆盖层没有明显遮挡核心区域。
- 在 280% 放大并显示当前色提示后，顶部状态胶囊会遮住上方若干格子的色号，底部工具与缩放层会遮住下方边缘格子色号。
- 这属于视觉覆盖问题，不是 layout 占高问题；画布仍铺满标题栏以下区域。

截图：

- `TEMP/phase1a_acceptance_current_color.png`

建议：

- 不建议直接进入 Phase1-B。
- 先做一个独立 Phase1-A follow-up，目标是降低高倍率下状态胶囊与底部工具对图纸边缘格子的长期遮挡。

### 2. 当前板状态提示是否清楚

结论：通过。

MCP 可见状态：

- `板1 · 第1行 第1列`
- `进度 0/1 · 剩余1块`
- `进行中`
- `下一步：完成本板`

该提示能明确告诉用户当前板位置、制作进度和下一步动作。

### 3. 当前色 / 当前格提示是否明显但不过度打扰

结论：功能可读性通过，视觉占用需跟进。

MCP 在 280% 放大后点击格子，可见：

- `板1 · 列15 行15 · 80-19005 · 本板113颗 / 总计113颗`

该信息足够明确，但当前胶囊高度偏大，在高倍率下会遮挡顶部格子，需要与第 1 项一起优化。

### 4. 帮助入口是否容易发现

结论：通过。

MCP 验证：

- 点击底部 `工具` 后，可见 `帮助` 按钮。
- 点击 `帮助` 可打开既有 `单板模式引导`。
- 设置抽屉内可见 `制作帮助 / 查看`，点击后同样打开既有引导。

### 5. 工具抽屉打开时底层画布是否仍然冻结

结论：通过。

MCP 验证：

- 工具抽屉打开后，对底层区域执行拖动。
- 验证前后画布矩形变化量：`0`。
- 说明工具抽屉打开时底层画布没有响应拖动。

### 6. 桌面端、传统模式、多板非沉浸式是否未受影响

结论：通过。

MCP 验证：

- 桌面视口 `1280x900` 可打开制作页。
- 传统模式可切换，原工具栏、复位、换色、下载图纸、设置仍显示。
- 注入 `120x120` 多板样张后，桌面单板模式显示 `0/4`、`剩余4块`、`板1/板2/板3/板4`、`上一板/下一板`。
- 未发现黑屏或路由异常。

截图：

- `TEMP/phase1a_acceptance_desktop_multiboard.png`

### 7. 手机真实触摸场景是否稳定

结论：MCP 触摸模拟通过；真实手机需继续观察。

MCP 触摸视口验证：

- 页面无黑屏。
- 点击工具、帮助、设置入口可用。
- 放大到 280% 后点击格子可显示当前格 / 当前色。
- 工具抽屉打开时底层画布冻结。

限制：

- 本机无法替代真实 iPhone / Android 长时间手持制作测试。
- 真机仍建议继续观察误触、遮挡、手指疲劳和连续制作稳定性。

### 8. 已知非本阶段问题

继续单独记录，不混入本次修复：

- `myColorsService` 云同步 HTTP 500。
- React `border` / `borderColor` 混用 warning。
- Vite build chunk size warning。

## Fresh Verification

- `cmd /c node --test TEST\single_board_interaction.test.mjs`
  - 51 tests
  - 51 pass
  - 0 fail
- `cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs`
  - 8 tests
  - 8 pass
  - 0 fail
- `cmd /c npm.cmd run build`
  - exit code 0
  - only existing chunk size warning

## 是否进入 Phase1-B

建议：暂不进入 Phase1-B。

理由：

- Phase1-A 的功能链路、冻结模型、layout 不占高、桌面/传统/多板边界验证通过。
- 但高倍率当前色提示与底部工具覆盖层存在真实视觉遮挡，属于制作体验 P0 质量问题。
- 如果直接进入 Phase1-B，后续帮助/引导层会叠加更多覆盖层，容易扩大遮挡问题。

建议下一步：

- 先开独立 `Phase1-A follow-up：高倍率覆盖层遮挡优化`。
- 只处理顶部状态 / 当前色胶囊 / 底部工具弱隐藏或边缘化。
- 不改手势模型，不改切板模型，不进入 Phase1-B。

## 回滚方式

如需回滚 Phase1-A 实现：

```powershell
git revert a3d373e4
```

如只回滚本验收记录：

```powershell
git revert <acceptance_record_commit_hash>
```
