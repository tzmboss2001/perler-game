# 制作流程产品化 Phase1-B 冻结提示最小 UI 记录

日期：2026-05-18

## 范围

本次是 Phase1-B 的第二步：在已完成的 freeze model helper 基础上，做最小 UI 显式化。

本次只做：

- 帮助入口显式化；
- 当前冻结状态提示；
- 用户为什么不能拖动 / 缩放 / 切板的轻提示；
- overlay 状态优先级对应文案；
- 设置抽屉 / 工具栏帮助入口一致性。

本次不做：

- 不改手势模型；
- 不改缩放逻辑；
- 不改拖动边界；
- 不改复位逻辑；
- 不改沉浸式 layout；
- 不新增独立帮助浮层；
- 不发布正式域名。

## 设计

### 冻结提示

新增 `getSingleBoardMobileFreezeHint`，根据 `activeOverlay` 与 `freezesCanvas` 输出轻提示文案。

文案映射：

| activeOverlay | title | text |
| --- | --- | --- |
| `toolbar` | 工具已展开 | 收起工具后可继续拖动、缩放和切板 |
| `settings` | 辅助面板打开中 | 关闭辅助面板后可继续操作图纸 |
| `overview` | 总览打开中 | 收起总览后可继续拖动、缩放和切板 |
| `onboarding` | 制作帮助打开中 | 关闭帮助后可继续拖动和缩放图纸 |
| `help` | 制作帮助打开中 | 关闭帮助后可继续拖动和缩放图纸 |
| `modal` | 弹窗打开中 | 关闭弹窗后可继续制作 |

`detail-focus` 不显示冻结提示，因为它不冻结画布。

### UI 位置

冻结提示复用现有 `mobileImmersiveClass("status-hint")` 覆盖层位置：

- 不新增 layout 高度；
- 不新增底部工具栏占位；
- 不改变图纸容器高度；
- `pointerEvents: none`，不抢底层点击；
- 当 freeze hint 可见时，临时替代原切板状态提示；
- 关闭 overlay 后恢复原切板状态提示。

### 帮助入口一致性

新增 `handleOpenSingleBoardHelp`：

- 收起设置面板；
- 收起工具抽屉；
- 打开单板引导；
- 工具栏“帮助”和设置抽屉“制作帮助 / 查看”共用同一个 opener。

这样避免两个入口未来出现不一致逻辑。

## 修改文件

- `perler-beads/src/utils/singleBoardInteraction.js`
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `TEST/single_board_interaction.test.mjs`
- `TEST/mobile_immersive_visual_contract.test.mjs`

## 测试

新增测试：

- freeze hint 能解释 blocking overlay 为什么暂停画布操作；
- freeze hint 遵循 overlay priority；
- passive `detail-focus` 不显示冻结提示；
- `MakingPage.tsx` 使用 `getSingleBoardMobileFreezeHint`；
- freeze hint 仍位于现有 overlay status layer；
- 工具栏和设置抽屉帮助入口共用 `handleOpenSingleBoardHelp`。

已验证：

- `cmd /c node --test TEST\single_board_interaction.test.mjs`：58/58 pass
- `cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs`：12/12 pass

## MCP 验证

环境：

- URL：`http://127.0.0.1:3016/mobile/making?test=1`
- 视口：`390x844x2,mobile,touch`

结果：

- 工具抽屉打开后显示：
  - `工具已展开`
  - `收起工具后可继续拖动、缩放和切板`
- 工具抽屉打开时拖动画布，画布坐标变化为 `0`。
- 工具栏点击“帮助”后：
  - 工具抽屉收起；
  - 单板引导打开；
  - 显示 `制作帮助打开中 / 关闭帮助后可继续拖动和缩放图纸`。
- 设置抽屉点击“制作帮助 / 查看”后：
  - 设置面板关闭；
  - 单板引导打开；
  - 工具抽屉未保持展开。
- 截图保存：
  - `TEMP/phase1b_freeze_hint_help.png`

已知非本次问题：

- MCP console 仍有既有 `myColorsService` HTTP 500；
- 仍有既有 React inline-style `border` / `borderColor` warning；
- dev server 重启期间出现过 HMR websocket failed 记录，不属于本次功能问题。

## 风险边界

本次只复用已有 status hint 覆盖层，没有新增 layout 占位。风险集中在：

- 冻结提示文案是否过度遮挡；
- 工具栏和设置抽屉入口共用 opener 后，用户是否预期设置面板关闭。

当前处理：

- 提示只在 blocking overlay 打开时出现；
- overlay 关闭后恢复原切板提示；
- 帮助打开时关闭其它工具层，降低遮挡叠加。

## 回滚

如发现帮助提示影响制作节奏，可以单独 revert 本次提交，不影响 Phase1-A 和 Phase1-B freeze model helper。

## 结论

Phase1-B 的冻结状态轻提示与帮助入口一致性已完成最小 UI 实现。下一步如果继续，应进入“帮助内容产品化”或“状态提示视觉细化”，仍需保持 overlay-only 和 TDD。
