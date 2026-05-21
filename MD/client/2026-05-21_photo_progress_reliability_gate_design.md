# 2026-05-21 拍照同步识别可靠性保护层设计

## 背景

真实手机测试中，用户拍摄当前实体板并进入 `拍照同步（试验）` 后，系统显示大量疑似错误，例如 `5895 疑似错误`。这说明当前识别结果已经明显不可靠，但系统仍然允许进入确认保存流程。

本阶段目标不是先提高识别算法上限，而是先建立“坏结果保护层”：当识别结果明显不可信时，禁止保存，提示用户重新拍摄、重新校准或重新取空孔参考，避免错误进度污染制作状态。

## 问题归属

- 不是后端问题：识别发生在前端 Canvas，本阶段不调用后端识别接口。
- 不是接口问题：没有网络识别接口参与判断。
- 不是配置问题：没有服务端配置决定识别结果。
- 不是数据结构主问题：当前 `done_candidate / suspected_wrong / low_confidence / pending` 结构可继续使用。
- 是前端识别链路与可靠性门槛问题：当前预览转换和确认保存模型过于乐观。

## Phase1 目标

1. 高风险识别结果必须被拦截。
2. 不可靠结果不得进入确认保存。
3. 用户必须能知道为什么不能保存。
4. 用户必须有明确下一步：重拍、调四角、重取空孔。
5. 不改变现有制作页手势、缩放、切板、复位和沉浸式布局。

## 非目标

- 不做多板自动识别。
- 不做自动纠错。
- 不做自动保存。
- 不做云端 AI 识别。
- 不重写当前颜色匹配算法。
- 不改变 `boardStatusMap`。

## 可靠性模型

### 新增概念

在 `createPhotoProgressPreview()` 输出中增加 `reliability`：

```ts
type PhotoProgressReliabilityLevel = "good" | "warning" | "blocked";

interface PhotoProgressReliability {
  level: PhotoProgressReliabilityLevel;
  score: number;
  wrongRatio: number;
  lowConfidenceRatio: number;
  pendingRatio: number;
  doneCandidateRatio: number;
  reasons: string[];
  userAction: "can_confirm" | "review_carefully" | "retry_required";
}
```

### 比例定义

只统计当前板实际有目标豆子的格子，也就是 `preview.cells.length`：

- `wrongRatio = suspectedWrongCount / totalTargetCells`
- `lowConfidenceRatio = lowConfidenceCount / totalTargetCells`
- `pendingRatio = pendingCount / totalTargetCells`
- `doneCandidateRatio = doneCandidateCount / totalTargetCells`

如果 `totalTargetCells <= 0`，直接 `blocked`。

## 阈值方案

第一版先保守，保护真实用户进度优先：

| 条件 | 结果 | 原因 |
|---|---|---|
| `wrongRatio >= 0.25` | `blocked` | 疑似错误过高，通常代表四角、空孔或取景失败 |
| `wrongRatio >= 0.12 && doneCandidateRatio < 0.35` | `blocked` | 错误偏高且候选完成不足，不应保存 |
| `lowConfidenceRatio >= 0.45` | `blocked` | 大量低可信，说明反光、阴影或颜色漂移明显 |
| `wrongRatio + lowConfidenceRatio >= 0.55` | `blocked` | 不确定和错误合计过高 |
| `pendingRatio >= 0.75 && doneCandidateRatio < 0.1` | `blocked` | 基本没识别出有效完成 |
| `qualityLevel === "poor"` | `blocked` | 已有质量模型判定差 |
| `wrongRatio >= 0.08` 或 `lowConfidenceRatio >= 0.25` | `warning` | 可以看预览，但需要谨慎人工确认 |
| 其它情况 | `good` | 允许进入确认保存 |

当前用户截图中 `5895 疑似错误` 明显会命中 `wrongRatio >= 0.25`，应被拦截。

## 质量评分规则

`score` 用 0 到 100 表示：

```text
score = 100
  - wrongRatio * 160
  - lowConfidenceRatio * 80
  - pendingRatio * 35
  - qualityPoorPenalty
  - qualityWarningPenalty
```

建议：

- `qualityPoorPenalty = 35`
- `qualityWarningPenalty = 12`
- 最终 `score` clamp 到 `0..100`

分级：

- `score >= 78` 且没有 blocked 条件：`good`
- `score >= 55` 且没有 blocked 条件：`warning`
- 低于 55：`blocked`

评分只用于解释和排序，真正阻断以阈值规则为准。

## 保存保护

`createPhotoProgressConfirmationModel()` 必须读取 `preview.reliability`。

规则：

- `reliability.level === "blocked"` 时：
  - `canSaveDefaultSelection = false`
  - `selectableCellIndexes = []`
  - `defaultSelectedCellIndexes = []`
  - 增加 `blockedReasonText`
- `warning` 时：
  - 仍允许进入确认，但 UI 要显示“请人工重点检查”。
- `good` 时：
  - 保持现有确认保存流程。

`handleEnterConfirmProgress()` 继续只依赖 confirmation model，不直接复制阈值逻辑，避免 UI 和模型判断不一致。

## UI 提示方案

### blocked 预览状态

在识别预览区顶部显示阻断卡片：

```text
本次识别不可靠，暂不能保存
原因：疑似错误过多 / 低可信区域过多 / 识别质量较差
建议：重新校准四角、重取空孔参考，或重新拍摄当前板
```

按钮：

- `调整四角`
- `重取空孔`
- `重新上传`

隐藏或禁用：

- `进入确认保存`

### warning 预览状态

显示轻提示：

```text
本次识别需要人工复核，保存前请重点检查红色和黄色区域。
```

仍允许进入确认保存，但默认选择只保留高可信 `done_candidate`。

## 四角校准网格 overlay 方案

### 目标

让用户在生成预览前能判断：系统网格是否和实体豆板孔位对齐。

### 展示时机

- 上传照片后不显示完整网格。
- 用户点满 4 个角后显示网格。
- 调整任意角点时实时更新网格。

### 网格内容

- 只画当前板的外框。
- 画主分区线：每 9 或 18 格一条较明显线。
- 画细网格：每格一条低透明度线。
- 不画每个豆子的颜色，避免干扰照片。

### 视觉规则

- 外框：青蓝色，透明度 70%。
- 主分区线：青蓝色，透明度 45%。
- 细网格：白色或青蓝色，透明度 14%。
- 网格不参与点击事件，`pointer-events: none`。

### 成功标准

用户能肉眼看到：

- 四角是否贴住板角。
- 网格线是否大致穿过孔位中心。
- 如果明显歪斜，用户能回到“调整四角”。

## 空孔多点采样方案

### 当前问题

当前 `emptyReferenceRgb` 只来自用户点击的单个点。如果该点在阴影、反光、边框或脏点上，会污染整板空孔判断。

### 第一版方案

用户仍然只点一次空孔，但程序在该点周围取多点样本：

- 中心点
- 左上、右上、左下、右下
- 上、下、左、右

共 9 点，半径建议为当前格采样半径的 `0.45`。

### 聚合方式

- 对 9 个样本按亮度排序。
- 去掉最亮 1 个和最暗 1 个，降低反光和阴影影响。
- 对剩余 7 个取 RGB 中位数或平均值。

### 质量判断

如果 9 点内部差异过大：

- `maxRgbDistance(samples) >= 45`：标记 `empty_reference_unstable`
- `maxRgbDistance(samples) >= 70`：阻止预览，提示“空孔参考不稳定，请重取空孔”

## 照片质量预检查

第一版不做复杂图像算法，只复用当前识别结果和简单图像信号：

- 过曝：空孔参考亮度过高，或 glareRatio 过高。
- 偏暗：空孔参考亮度过低。
- 明显偏色：空孔参考 RGB tint 过高。
- 板区域不足：四角形成区域过小，占上传照片显示区域不足 35%。
- 四边比例异常：上下边或左右边差异过大，提示透视/角点可能错。

第一版不做模糊检测，避免引入不稳定判断。模糊检测后续单独设计。

## 涉及文件

- `perler-beads/src/services/photoProgressService.js`
  - 增加可靠性计算纯函数。
  - 在 preview 中写入 `reliability`。
  - 在 confirmation model 中阻断不可靠结果。
- `perler-beads/src/services/visionAssistService.ts`
  - 增加空孔多点采样所需的稳定性数据，或保留在 modal 内完成采样后传入。
  - 可补充四角区域几何质量字段。
- `perler-beads/src/components/PhotoProgressSyncModal.tsx`
  - 展示 blocked/warning 文案。
  - 禁用确认保存入口。
  - 增加四角网格 overlay。
  - 空孔取样改为多点采样。
- `TEST/photo_progress_service.test.mjs`
  - 增加 reliability gate 纯函数测试。
- `TEST/photo_progress_modal_contract.test.mjs`
  - 增加 UI 契约：blocked 文案、网格 overlay、保存入口受模型控制。
- `TEST/photo_progress_phase1b_acceptance.test.mjs`
  - 增加高错误比例合成样张验收。

## MCP 验收计划

1. 打开正式或本地制作页。
2. 进入单板模式。
3. 打开 `工具 -> 辅助 -> 拍照同步（试验）`。
4. 上传当前板照片。
5. 点四角后确认出现网格 overlay。
6. 故意点偏四角，生成预览后应出现“不可靠，暂不能保存”。
7. 点 `调整四角` 后能继续校准。
8. 点 `重取空孔` 后能重新采样。
9. 正常合成样张仍能进入确认保存。
10. 关闭弹层后制作页缩放、拖动、切板恢复正常。

## 真机验收计划

至少使用 Android 和 iPhone 各测三组：

- 正常照片：当前板占满画面，少反光，四角准确，应允许保存。
- 错误校准：故意点偏一角，应 blocked。
- 强反光/阴影：应 warning 或 blocked，不允许高错误结果直接保存。

验收重点：

- 用户是否能理解为什么不能保存。
- 网格是否能帮助发现四角偏移。
- 重取空孔是否容易操作。
- blocked 是否不会误伤明显正常照片。

## 日志与排查

后续实现时建议在开发环境增加调试日志：

```text
[photo-progress] preview metrics
boardNumber
totalTargetCells
doneCandidateCount
suspectedWrongCount
lowConfidenceCount
pendingCount
wrongRatio
lowConfidenceRatio
pendingRatio
doneCandidateRatio
qualityLevel
qualityIssues
reliability.level
reliability.reasons
emptyReferenceRgb
emptyReferenceStability
corners
```

正式环境不默认刷屏，只在开发环境或 debug flag 下输出。

## 回滚方案

- 如果可靠性门槛误伤正常照片，可先把阈值放宽或临时关闭 blocked 逻辑。
- 如果网格 overlay 影响操作，可单独回滚 overlay 提交，不影响可靠性 gate。
- 如果多点空孔采样不稳定，可回滚到单点采样，但保留保存保护。
- 所有改动均为前端本地逻辑，不涉及数据库和后端接口，回滚风险低。

## 建议实施顺序

1. 先做 `photoProgressService.js` 可靠性纯函数和测试。
2. 再接入确认保存阻断。
3. 再做 UI blocked/warning 提示。
4. 再做四角校准网格 overlay。
5. 最后做空孔多点采样。

每一步独立提交，便于发现误伤后单独回滚。
