# Phase1-B 冻结提示最小 UI 验收记录

## 范围

本次只做 Phase1-B freeze hint minimal UI 的小范围验收收口，不扩展 UI，不修改业务代码，不发布正式域名。

验收基线：

- commit: `ad17dac3 feat: add phase1b freeze hint overlay`
- worktree: `making-workflow-productization-phase1-design`
- 页面: `http://127.0.0.1:3016/mobile/making?test=1`

## 验收重点

1. 冻结提示是否清楚说明为什么不能拖动/缩放。
2. 提示是否遮挡当前格、色号或关键按钮。
3. 工具抽屉、设置抽屉、帮助入口三种场景提示是否一致。
4. 关闭后是否稳定恢复缩放/拖动。
5. 桌面端、传统模式、多板模式是否未受影响。

## MCP 验收结果

### 手机端单板沉浸式

- 工具抽屉打开后显示：
  - `工具已展开`
  - `收起工具后可继续拖动、缩放和切板`
- 设置抽屉打开后显示：
  - `辅助面板打开中`
  - `关闭辅助面板后可继续操作图纸`
- 从设置抽屉点击 `制作帮助 / 查看` 后：
  - 设置抽屉关闭
  - 工具抽屉关闭
  - 单板帮助打开
  - 提示切换为 `制作帮助打开中 / 关闭帮助后可继续拖动和缩放图纸`
- 关闭帮助后：
  - 冻结提示消失
  - 恢复普通滑动切板状态提示
  - 缩放按钮可继续生效，`+` 后从 `100%` 到 `110%`

### 遮挡检查

- 工具抽屉场景截图：`TEMP/phase1b_acceptance_tool_hint.png`
- 设置抽屉场景截图：`TEMP/phase1b_acceptance_settings_overlap.png`
- 冻结提示位于顶部边缘状态层，`pointer-events: none`，不阻断点击。
- 工具抽屉场景未遮挡底部工具按钮、缩放条、完成按钮。
- 设置抽屉场景提示与抽屉顶边比较贴近，但截图确认未遮挡右上关闭按钮；后续真机如反馈视觉拥挤，可单独做微调。
- 当前样例中未发现提示遮挡当前格中心、色号或主操作按钮的问题。

### 桌面端 / 传统模式 / 多板非沉浸式

- 桌面宽屏视口 `1365x768` 可正常打开制作页。
- 桌面单板仍显示桌面工具区，未出现 `data-phase1b-freeze-hint`。
- 传统模式可切换，传统模式下未出现冻结提示。
- 多板导航与桌面侧边栏仍可见，未发现由 Phase1-B freeze hint 引入的显示异常。

## 自动验证

执行命令：

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
cmd /c npm.cmd run build
```

结果：

- `single_board_interaction.test.mjs`: 58/58 pass
- `mobile_immersive_visual_contract.test.mjs`: 12/12 pass
- `npm run build`: 通过
- build 仍保留既有 chunk size warning，非本次改动引入

## 已知非本次问题

- `myColorsService HTTP 500` 仍会在本地开发环境出现，继续单独记录，不混入本次 Phase1-B 收口。
- React inline style warning 仍存在，属于既有样式告警，不混入本次 Phase1-B 收口。

## 风险判断

- 本次验收没有发现必须阻断 Phase1-B freeze hint minimal UI 收口的问题。
- 当前提示文案能解释为什么不能拖动/缩放，且关闭 overlay 后操作可恢复。
- 冻结提示仍保持 overlay-only，不参与 layout 占高，不改手势模型、缩放、拖动边界、复位逻辑。
- 设置抽屉场景顶部空间较紧，建议进入稳定观察；只有真机反馈明显遮挡时，再作为独立微调提交处理。

## 结论

建议 Phase1-B freeze hint minimal UI 阶段收口。

下一步不建议继续扩大 UI 范围；如进入 Phase1-B 后续工作，应重新拆分小任务并保持：

- overlay-only
- 不改手势模型
- 不改 layout 占高
- 不改缩放 / 拖动边界 / 复位逻辑
- 每一步独立提交、独立验证、可回滚
