# 拍照同步进度 Phase1-C 设计与计划

日期：2026-05-21

## 1. 目标

Phase1-C 的目标是把 Phase1-B 的识别预览，推进到“用户确认后保存本地制作进度”的闭环。

核心原则：

- AI 只给候选结果，不自动决定真实完成进度。
- 用户确认后，只有被确认的 `done_candidate` 才能转成持久化的 `confirmed_done`。
- `suspected_wrong`、`pending/unknown`、`low_confidence` 永远不自动写入完成状态。
- 本阶段仍然只做单板，不做多板自动识别、不做云同步、不改后端。

## 2. 当前基线

已完成：

- Phase1-A：数据结构、`createPhotoProgressPreview()`、`confirmPhotoProgressPreview()`、`createPhotoProgressStorageKey()`、`detectedCells` 契约。
- Phase1-B：上传照片、四角校准、空孔参考、识别预览、合成样张验收、MCP 手机单板流程验证。

当前分支：

- `feature/photo-progress-phase1a`

当前 Phase1-C 前置结论：

- Phase1-B 不产生真正 `confirmed_done`。
- 当前 UI 的“候选完成”就是 `done_candidate`。
- Phase1-C 必须增加用户确认保存步骤，才能产生 `confirmed_done`。

## 3. 本轮范围

进入 Phase1-C：

- 用户确认保存流程。
- 只保存用户确认过的候选完成格。
- 保存后制作页显示已完成遮罩。
- 本次拍照同步结果可撤销或清除。
- `beadDataHash` 不一致时阻止旧进度恢复。
- 本地保存失败时提示并允许重试。
- 契约测试、纯函数测试、MCP 手机单板验收。

不进入 Phase1-C：

- 不改后端。
- 不做云同步。
- 不做多板自动识别。
- 不做自动纠错。
- 不做实时摄像头。
- 不改制作页手势、缩放、拖动、切板、复位逻辑。
- 不改变 Phase1-B 识别算法。

## 4. 推荐方案

### 方案 A：保守本地确认保存

流程：

1. 用户完成 Phase1-B 识别预览。
2. 点击“确认保存进度”进入确认面板。
3. 面板只列出 `done_candidate`，默认选中高可信候选完成。
4. 用户可以取消选择部分候选完成格。
5. 用户勾选“我已复核候选完成区域”。
6. 点击“保存本次同步结果”。
7. 系统调用 `confirmPhotoProgressPreview()` 生成 confirmed snapshot。
8. 本地保存 snapshot。
9. 制作页对 confirmed cells 显示轻灰/半透明遮罩。
10. 用户可撤销本次同步结果。

推荐采用。

理由：

- 满足“用户确认后才保存”。
- 不把低可信或疑似错误自动写入。
- 可以快速落地并通过本地回滚控制风险。

### 方案 B：逐格手动确认保存

流程：

- 所有候选完成默认不选中。
- 用户逐格点击确认。
- 保存确认后的格子。

不推荐作为 Phase1-C 首版。

原因：

- 真实作品可能有几百到几千格候选完成，逐格确认成本太高。
- 会把“拍照同步”变成另一种手动标记工具，降低产品价值。

### 方案 C：自动保存高可信候选完成

流程：

- 系统自动保存高可信 `done_candidate`。

明确不采用。

原因：

- 违反用户确认原则。
- 一旦照片角度、光照、空孔参考有误，可能污染制作进度。

## 5. 用户确认保存流程

确认面板应从 Phase1-B 预览结果进入，不独立作为新入口。

面板内容：

- 标题：`确认保存拍照同步结果`
- 当前板：`板 N`
- 候选完成数：`doneCandidateCount`
- 将保存数：用户当前选中的候选完成数
- 不会保存数：
  - 疑似错误 `suspectedWrongCount`
  - 未完成 / unknown `pendingCount`
  - 低可信 `lowConfidenceCount`
- 质量提示：`qualityLevel` 与 `qualityIssues`
- 复核确认 checkbox：`我已复核候选完成区域，只保存我确认的完成格`
- 主按钮：`保存本次同步结果`
- 次按钮：`返回预览`

默认选择规则：

- `done_candidate` 默认选中。
- `confidence < 0.75` 的候选完成不默认选中。
- `suspected_wrong`、`pending`、`low_confidence` 禁止选中。

保存按钮启用条件：

- 有至少 1 个候选完成格被选中。
- 用户已勾选复核确认 checkbox。
- `beadDataHash` 可计算。
- 当前 preview 的 `boardNumber` 与当前制作板一致。

## 6. 状态与数据模型

Phase1-C 应新增本地 snapshot，而不是直接改写 Phase1-B preview。

建议结构：

```ts
interface PhotoProgressConfirmedSnapshot {
  version: 1;
  projectId: string;
  beadDataHash: string;
  boardNumber: number;
  boardSize: number;
  usedWidth: number;
  usedHeight: number;
  source: "photo_upload";
  createdAt: number;
  confirmedAt: number;
  qualityLevel: "good" | "warning" | "poor";
  completedCount: number;
  suspectedWrongCount: number;
  lowConfidenceCount: number;
  confirmedCells: Array<{
    x: number;
    y: number;
    index: number;
    targetColorId: string | null;
    confidence: number;
    confirmedAt: number;
    source: "photo_upload";
  }>;
}
```

现有 `confirmPhotoProgressPreview()` 已接近该结构。Phase1-C 不需要重写转换逻辑，优先复用。

## 7. beadDataHash 规则

必须给每个保存结果绑定 `beadDataHash`。

推荐 hash 输入：

- `beadData.width`
- `beadData.height`
- 每格 `bead?.id || "-"` 按顺序拼接

恢复规则：

- 当前 `beadDataHash` 与 snapshot 的 `beadDataHash` 一致：允许恢复。
- 不一致：不恢复，并提示“图纸已变化，旧拍照同步进度已停用”。
- 不一致的旧数据可以保留在 storage 中，但不能套用到当前制作页。

存储 key：

- 继续使用 Phase1-A 的 `createPhotoProgressStorageKey({ projectId, beadDataHash })`。
- `projectId` 优先使用云端项目 ID；没有云端 ID 时使用 `local_${localProjectId}`；仍没有时使用稳定的临时制作 ID。

## 8. 本地保存失败处理

失败来源：

- localStorage quota exceeded。
- JSON stringify 失败。
- storage 不可用。

处理规则：

- 保存失败时不修改当前页面已完成遮罩。
- 弹出错误提示：`保存失败，请释放浏览器空间后重试`
- 保留当前确认面板状态，允许用户再次点击保存。
- 不静默吞掉失败。
- 不退回 Phase1-B 预览起点。

重试规则：

- 用户点击“重试保存”时重新执行相同 snapshot 写入。
- 重试成功后再更新制作页本地状态。

## 9. 制作页已完成遮罩

Phase1-C 只做轻量覆盖，不改变原图纸数据。

显示规则：

- 对 `confirmed_done` 格子显示灰度或低透明遮罩。
- 遮罩必须绘制在图纸/格子上方，但低于当前选中格、当前色高亮、坐标提示。
- 不覆盖色号到完全不可读。
- 建议视觉：
  - `rgba(255,255,255,0.42)` 或 `rgba(70,70,70,0.18)`
  - 可加细斜线纹理，但不建议首版做复杂纹理。

交互规则：

- 已完成遮罩不阻止用户点击、拖动、缩放。
- 用户仍可选择已完成格查看色号。
- 已完成格不自动标记为 MakingPage 原有“完成板”逻辑，除非用户另行点击现有完成按钮。

## 10. 撤销与清除

Phase1-C 必须支持撤销或清除本次同步结果。

最小规则：

- 保存成功后显示“撤销本次同步”入口。
- 撤销只删除最近一次 photo progress snapshot。
- 撤销后制作页遮罩立即消失。
- 撤销不影响用户手动完成的板状态。

清除规则：

- 后续可以扩展为“清除当前板拍照同步结果”。
- Phase1-C 首版只需要撤销最近一次同步，降低误删风险。

## 11. 旧进度恢复

页面进入制作模式时：

1. 计算当前 `beadDataHash`。
2. 根据 `projectId + beadDataHash` 读取本地 snapshot。
3. 如果 snapshot 存在且 hash 一致，恢复 confirmed cells。
4. 如果 hash 不一致，不恢复。
5. 恢复后只显示遮罩，不自动修改板完成状态。

恢复提示：

- 可短提示：`已恢复上次拍照同步进度`
- 如果 hash 不一致：`图纸已变化，旧拍照同步进度未恢复`

提示必须边缘化，不漂浮在图纸中央。

## 12. UI 层级与沉浸式不变量

必须保持：

- 手机端单板沉浸式图纸区域不被工具栏或保存确认栏挤压。
- 确认保存面板仍是 fixed overlay，不参与 layout。
- 弹层打开时底层画布冻结。
- 关闭后底层缩放、拖动、切板、复位恢复。
- 不新增长期遮挡图纸的常驻工具条。

## 13. 测试计划

新增或扩展测试：

- `TEST/photo_progress_confirm_persistence.test.mjs`
  - 只保存选中的 `done_candidate`
  - `suspected_wrong` 不保存
  - `pending/unknown` 不保存
  - `low_confidence` 不保存
  - 空选择不能保存
  - hash 不一致不恢复
  - 保存失败返回错误状态

- `TEST/photo_progress_modal_contract.test.mjs`
  - modal 中出现确认保存入口
  - modal 不直接调用后端 API
  - modal 不保存 suspected/pending/low confidence
  - modal 仍是 fixed overlay

- `TEST/mobile_immersive_visual_contract.test.mjs`
  - confirmed overlay 不参与 layout 占高
  - confirmed overlay 不阻断 pointer events

保留回归测试：

- `node TEST\photo_progress_phase1b_acceptance.test.mjs`
- `node TEST\photo_progress_service.test.mjs`
- `node TEST\photo_progress_vision_contract.test.mjs`
- `node TEST\photo_progress_modal_contract.test.mjs`
- `node TEST\single_board_interaction.test.mjs`
- `node TEST\mobile_immersive_visual_contract.test.mjs`
- `npm.cmd run build`

## 14. MCP 验收计划

手机单板：

1. 打开 `/mobile/making?test=1`。
2. 进入单板模式。
3. 打开工具抽屉。
4. 打开拍照同步。
5. 上传测试图片。
6. 点四角。
7. 点空孔。
8. 生成预览。
9. 进入确认保存。
10. 取消选择部分候选完成格。
11. 勾选复核确认。
12. 保存。
13. 关闭弹层。
14. 确认图纸出现已完成遮罩。
15. 确认遮罩不阻断拖动、缩放、选格。
16. 撤销本次同步。
17. 确认遮罩消失。
18. 刷新页面。
19. 确认已撤销结果不再恢复。

hash 不一致：

1. 保存一份 snapshot。
2. 模拟 beadDataHash 改变。
3. 刷新制作页。
4. 确认旧进度不恢复。
5. 看到边缘短提示。

## 15. 实施拆分建议

### Phase1-C-1：持久化纯函数与测试

只做：

- beadDataHash 计算。
- storage key 组装。
- snapshot 保存 / 读取 / 删除纯函数。
- hash 不一致保护。
- localStorage 失败处理。

不做 UI。

### Phase1-C-2：确认保存 UI

只做：

- Phase1-B preview 后进入确认面板。
- 候选完成选择。
- 复核确认 checkbox。
- 保存失败提示与重试。

不做制作页遮罩。

### Phase1-C-3：制作页遮罩与恢复

只做：

- 读取已确认 snapshot。
- 绘制 confirmed done 遮罩。
- 撤销本次同步。
- MCP 验证沉浸式不变量。

不做云同步、不做多板自动识别。

## 16. Stop Conditions

出现以下情况必须停止：

- 任意 `suspected_wrong`、`pending/unknown`、`low_confidence` 被写入 confirmed done。
- 未勾选复核确认也能保存。
- beadDataHash 不一致仍恢复旧进度。
- 保存失败后 UI 显示已保存。
- 弹层或遮罩重新参与制作页 layout 占高。
- 底层画布在确认弹层打开时仍可拖动或缩放。
- 单板沉浸式手势测试失败。
- 传统模式或桌面端被手机沉浸式逻辑污染。

## 17. 回滚策略

每个子阶段独立提交：

- C-1 可只 revert storage helper 与测试。
- C-2 可只 revert 确认保存 UI。
- C-3 可只 revert 制作页遮罩和恢复逻辑。

如需整体回滚：

```powershell
git revert <phase1c-c3-commit> <phase1c-c2-commit> <phase1c-c1-commit>
```

## 18. 结论

Phase1-C 可以进入实现计划，但建议按 C-1 / C-2 / C-3 小步推进。

当前最重要的产品边界是：

- AI 识别结果不能直接污染制作进度。
- confirmed done 必须来自用户确认。
- 旧进度必须被 beadDataHash 保护。
- 保存结果必须可撤销。
