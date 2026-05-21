# 拍照同步进度 Phase1-B 验收收口

日期：2026-05-20

## 验收范围

本次只验收 Phase1-B 最小预览闭环，不进入 Phase1-C 保存进度。

验收项：

- 合成样张：全部正确 / 部分未完成 / 单格错色 / 低可信区域。
- 四角校准是否容易理解。
- 空孔参考色取样是否容易操作。
- 识别预览是否清楚区分候选完成 / 疑似错误 / unknown 或 pending / 低可信。
- 弹层是否遮挡或破坏手机单板沉浸式 layout。
- 关闭后制作页缩放、拖动、切板模型是否保持稳定。

## 合成样张结果

新增脚本：

- `TEST/photo_progress_phase1b_acceptance.test.mjs`

结果：

- 全部正确：`done_candidate=16`，`suspected_wrong=0`，`pending=0`，`low_confidence=0`
- 部分未完成：`done_candidate=12`，`pending=4`，`suspected_wrong=0`，`low_confidence=0`
- 单格错色：`done_candidate=15`，`suspected_wrong=1`，`pending=0`，`low_confidence=0`
- 低可信区域：`done_candidate=0`，`low_confidence=16`，质量等级为 `poor`

说明：

- Phase1-B 仍是“预览阶段”，不产生真正的 `confirmed_done`。
- 当前 UI 中的“候选完成”表示 `done_candidate`，只有 Phase1-C 用户确认保存后才能转成 confirmed done。
- `pending` 在产品语义上等价于当前阶段的 unknown / 未完成，不会被自动保存。

## MCP 手机视口验收

环境：

- 本地地址：`http://127.0.0.1:5185/mobile/making?test=1`
- 视口：390 × 844，mobile touch
- 模式：手机端单板制作模式

结果：

- 工具抽屉中可看到“拍照同步（试验）/ 预览”入口。
- 弹层为 `position: fixed`，覆盖在制作页上方，不重新参与 layout 占高。
- 弹层打开时页面 `bodyHeight=844`，与 `viewportHeight=844` 一致，未额外撑高文档。
- 上传合成静态图片后，步骤提示从“请点击拼豆板左上角”开始，四角顺序可理解。
- 四角点击完成后显示 1/2/3/4 角点标记，支持“调整四角”“撤销点位”“重取空孔”。
- 空孔取样后显示参考 RGB，例如 `236, 162, 194`，操作路径明确。
- 生成预览后显示候选完成、疑似错误、低可信、未完成、识别质量。
- 格级预览作为视觉层呈现，不再把每个格子暴露成大量辅助树节点。
- 点击关闭后回到制作页，弹层消失。
- 关闭后点击 `+` 缩放按钮，缩放从约 100% 变为约 110%，缩放控制可恢复。
- 关闭后向画布派发 touch pointer drag，页面无黑屏、无弹层残留、无状态阻断。

## 交互判断

四角校准：

- 当前提示“依次点击左上 / 右上 / 右下 / 左下”是可理解的。
- 支持撤销和重新调整，满足 Phase1-B 手动校准要求。
- 后续 Phase1-C 前不需要继续扩大交互复杂度。

空孔参考：

- 当前空孔取样路径清楚，取样后有 RGB 反馈。
- 真实用户可能不知道“空孔”应点哪里，Phase1-C 前建议在文案中补一句“点一个还没放豆的孔位”，但这不是 Phase1-B 阻塞项。

识别预览：

- 当前可以区分候选完成、疑似错误、低可信、未完成。
- 由于 Phase1-B 不保存进度，`confirmed_done` 不应出现为最终状态。
- Phase1-C 应增加“用户确认后保存”步骤，再引入 confirmed done。

沉浸式影响：

- 弹层为 fixed overlay，不挤压单板沉浸式工作区。
- 关闭后制作页可继续缩放和响应画布操作。
- 手势、缩放、拖动、切板、复位逻辑未改。

## 已知非本次问题

- 本地 dev token 下 `myColorsService` 仍可能返回 HTTP 500，这是既有后端/数据问题，本次不处理。
- 控制台仍存在既有 React style shorthand/non-shorthand warning，未定位为本次拍照同步阻塞项。

## 是否进入 Phase1-C

建议：可以进入 Phase1-C 设计阶段，但不要直接实现保存。

Phase1-C 前置条件：

- 明确用户确认保存 UI。
- 明确只保存用户确认过的 `done_candidate`。
- 明确 `suspected_wrong`、`pending/unknown`、`low_confidence` 一律不自动写入完成进度。
- 增加回滚入口：用户保存后必须能撤销本次拍照同步结果。
- 继续保持单板优先，不做多板自动识别。
