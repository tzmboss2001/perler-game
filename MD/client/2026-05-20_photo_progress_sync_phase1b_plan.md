# Photo Progress Sync Phase1-B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Phase1-A 基础上完成“上传照片 -> 静态图片进 canvas -> 当前板确认 -> 手动四角校准 -> 空孔参考 -> 识别预览”的最小闭环。

**Architecture:** Phase1-B 新增一个独立 `PhotoProgressSyncModal` 覆盖层，不复用实时摄像头弹层，不写入真实制作进度。弹层只读取当前制作页上下文、静态图片 canvas 和 Phase1-A 的 `createPhotoProgressPreview()`，输出预览摘要和低可信提示。

**Tech Stack:** React 19、Vite、TypeScript/JS mixed source、Node test、现有 `visionAssistService.ts`、Phase1-A `photoProgressService.js`、MCP Chrome DevTools。

---

## 1. 基线
- 当前基础分支：`feature/photo-progress-phase1a`
- 当前基础提交：`3aab7cd1`
- Phase1-A 已完成：数据结构、转换纯函数、空孔参考规则、`detectedCells` 契约、合成样张测试
- Phase1-B 开始前不 merge main、不 PR、不发布

## 2. 本轮范围
进入 Phase1-B：
- 上传照片入口
- 静态图片加载到隐藏 canvas
- 当前板确认，默认使用 `activeBoardNumber / visionInitialBoardIndex`
- 手动四角校准
- 空孔参考色取样
- 调用 `analyzeVisionProgress()`
- 调用 `createPhotoProgressPreview()`
- 显示识别预览摘要：候选完成、疑似错误、低可信、未完成
- 工具弹层作为 fixed overlay，不参与制作页 layout

不进入 Phase1-B：
- 不保存真实制作进度
- 不调用 `confirmPhotoProgressPreview()`
- 不写 localStorage photo progress
- 不改后端 progress API
- 不做多板自动识别或自动保存
- 不做自动纠错
- 不做实时摄像头
- 不改手势、缩放、拖动边界、切板、复位逻辑

## 3. 文件计划
创建：
- `perler-beads/src/components/PhotoProgressSyncModal.tsx`
- `TEST/photo_progress_modal_contract.test.mjs`
- `MD/client/2026-05-20_photo_progress_sync_phase1b_result.md`

修改：
- `perler-beads/src/pages/mobile/MakingPage.tsx`

保持不动：
- 后端目录
- `projectApi.ts`
- `boardStatusMap` 保存逻辑
- 云同步逻辑
- 单板手势相关 helper

## 4. UI 状态机
`PhotoProgressSyncModal` 使用明确状态：
- `upload`：选择/拍摄照片
- `corners`：按左上、右上、右下、左下顺序点四角
- `empty-reference`：点击一个空孔取样
- `preview`：展示识别结果
- `error`：图片读取失败、canvas 不可用或识别条件不足

状态转移：
- `upload -> corners`：图片加载成功并绘制到 canvas
- `corners -> empty-reference`：四角数量达到 4
- `empty-reference -> preview`：成功取样空孔并点击生成预览
- 任意状态 -> `upload`：重新上传
- 任意状态 -> `corners`：重新校准

## 5. 当前板规则
Phase1-B 只做“当前板确认”，不做多板自动识别。

规则：
- 默认使用制作页当前板对应的 `visionInitialBoardIndex`
- 弹层顶部显示：`当前板：板 N`
- 如果 `initialBoardIndex` 无效，回退到第 1 块板
- 不调用 `findBestVisionBoardMatch()`
- 不自动切换制作页当前板

## 6. 校准与识别规则
四角：
- 用户按顺序点击左上、右上、右下、左下
- 点击坐标映射到图片 naturalWidth/naturalHeight 坐标系
- 显示角点序号和四边形轮廓

空孔参考：
- 用户点击一个空孔
- 从 canvas 中采样 RGB
- 采样成功后允许生成预览
- 没有空孔参考时不允许调用识别

识别：
- 从 canvas 获取 `ImageData`
- 使用当前板 `VisionBoardTile`
- 调用 `analyzeVisionProgress()`
- 调用 `createPhotoProgressPreview({ hasEmptyReference: true })`

## 7. 预览显示
预览摘要必须显示：
- 候选完成 N
- 疑似错误 N
- 低可信 N
- 未完成 N
- 质量等级：good / warning / poor

低可信区域：
- Phase1-B 先在摘要和图例里提示
- 可用轻量黄点/斜纹表示
- 不要求本轮实现完整可点击错误列表

疑似错误：
- Phase1-B 只显示数量和说明
- 不定位、不保存、不自动纠错

## 8. TDD 任务
### Task 1: Modal Contract Test
**Files:**
- Create: `TEST/photo_progress_modal_contract.test.mjs`

- [ ] Step 1: 写失败测试，检查 modal 文件不存在时失败

测试内容：
- `PhotoProgressSyncModal.tsx` 存在
- 包含 `PhotoProgressSyncStep`
- 包含 `upload / corners / empty-reference / preview / error`
- 使用 `type="file"`
- 使用 `accept="image/*"`
- 使用 `capture="environment"`
- 使用 `createPhotoProgressPreview`
- 使用 `analyzeVisionProgress`
- 不出现 `confirmPhotoProgressPreview`
- 不出现 `localStorage.setItem`
- 根层使用 `position: "fixed"`

命令：
```powershell
node TEST\photo_progress_modal_contract.test.mjs
```

预期：FAIL，原因是 modal 文件不存在。

### Task 2: Modal Skeleton
**Files:**
- Create: `perler-beads/src/components/PhotoProgressSyncModal.tsx`

- [ ] Step 1: 实现最小 modal
- [ ] Step 2: 支持上传 input
- [ ] Step 3: 支持状态机
- [ ] Step 4: 暂不接 MakingPage
- [ ] Step 5: 跑 contract test

命令：
```powershell
node TEST\photo_progress_modal_contract.test.mjs
```

预期：PASS。

### Task 3: Image Canvas And Calibration
**Files:**
- Modify: `perler-beads/src/components/PhotoProgressSyncModal.tsx`
- Modify: `TEST/photo_progress_modal_contract.test.mjs`

- [ ] Step 1: 扩展测试，检查 `drawImageToCanvas / getImagePoint / handleImageClick / sampleCanvasRgb`
- [ ] Step 2: 实现图片 `onLoad` 绘制到 canvas
- [ ] Step 3: 实现点击图片映射坐标
- [ ] Step 4: 实现四角记录
- [ ] Step 5: 实现空孔 RGB 取样
- [ ] Step 6: 跑 contract test

命令：
```powershell
node TEST\photo_progress_modal_contract.test.mjs
```

预期：PASS。

### Task 4: Recognition Preview
**Files:**
- Modify: `perler-beads/src/components/PhotoProgressSyncModal.tsx`
- Modify: `TEST/photo_progress_modal_contract.test.mjs`

- [ ] Step 1: 扩展测试，检查 `runPreview`
- [ ] Step 2: 调用 `analyzeVisionProgress()`
- [ ] Step 3: 调用 `createPhotoProgressPreview()`
- [ ] Step 4: 显示 preview summary
- [ ] Step 5: 确认没有保存逻辑

命令：
```powershell
node TEST\photo_progress_modal_contract.test.mjs
node TEST\photo_progress_service.test.mjs
node TEST\photo_progress_vision_contract.test.mjs
```

预期：全部 PASS。

### Task 5: MakingPage Entry
**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `TEST/photo_progress_modal_contract.test.mjs`

- [ ] Step 1: 扩展测试，检查 `MakingPage` 引入 `PhotoProgressSyncModal`
- [ ] Step 2: 增加 `showPhotoProgressSync`
- [ ] Step 3: 在工具抽屉增加 `拍照同步`
- [ ] Step 4: 渲染 modal
- [ ] Step 5: 保留原 `视觉辅助`

命令：
```powershell
node TEST\photo_progress_modal_contract.test.mjs
node TEST\mobile_immersive_visual_contract.test.mjs
node TEST\single_board_interaction.test.mjs
```

预期：全部 PASS。

### Task 6: Build And Record
**Files:**
- Create: `MD/client/2026-05-20_photo_progress_sync_phase1b_result.md`

- [ ] Step 1: 运行完整验证

命令：
```powershell
node TEST\photo_progress_modal_contract.test.mjs
node TEST\photo_progress_service.test.mjs
node TEST\photo_progress_vision_contract.test.mjs
node TEST\single_board_interaction.test.mjs
node TEST\mobile_immersive_visual_contract.test.mjs
Push-Location perler-beads
npm.cmd run build
Pop-Location
```

- [ ] Step 2: 记录验证结果到 MD
- [ ] Step 3: 提交 Phase1-B

提交：
```powershell
git add perler-beads/src/components/PhotoProgressSyncModal.tsx perler-beads/src/pages/mobile/MakingPage.tsx TEST/photo_progress_modal_contract.test.mjs MD/client/2026-05-20_photo_progress_sync_phase1b_result.md
git commit -m "feat: add photo progress phase1b preview flow"
```

## 9. MCP 验收计划
本轮实现后再跑，不在计划阶段执行。

手机视口：
1. 打开 `/mobile/making?test=1`
2. 切到单板模式
3. 打开工具抽屉
4. 点击 `拍照同步`
5. 确认弹层覆盖显示，不挤压图纸 layout
6. 上传测试图片
7. 点击四角
8. 点击空孔参考
9. 生成预览
10. 看到候选完成、疑似错误、低可信、未完成摘要
11. 关闭弹层
12. 确认缩放、拖动、切板、复位仍正常
13. 确认原 `视觉辅助` 入口还在

桌面/传统模式：
1. 宽屏打开制作页
2. 确认没有手机沉浸式布局污染
3. 切传统模式
4. 确认新弹层关闭后无残留

## 10. 真机验收计划
Android Chrome：
- `<input capture="environment">` 可打开拍照
- 图片上传后能显示
- 点击四角和空孔操作可用

iPhone Safari：
- 拍照后图片能加载
- 如果图片方向异常，记录为 Phase1-B blocker，不继续扩大功能
- 弹层滚动不带动底层画布

## 11. Stop Conditions
出现以下情况停止：
- 弹层占用 layout 高度
- 工具抽屉或弹层打开后底层画布仍能被拖动
- `confirmPhotoProgressPreview()` 被接入 UI
- 出现 localStorage / API 保存进度逻辑
- 原 `视觉辅助` 入口消失
- 单板缩放、拖动、切板、复位测试失败
- iPhone 上传照片无法读取

## 12. 回滚策略
Phase1-B 单独回滚：
```powershell
git revert <phase1b-commit>
```

手动回滚：
- 删除 `PhotoProgressSyncModal.tsx`
- 删除 `photo_progress_modal_contract.test.mjs`
- 移除 `MakingPage.tsx` 的 import、state、入口按钮和 modal render
- 删除 Phase1-B result MD

## 13. 计划自查
- 覆盖上传照片入口、静态图片 canvas、当前板识别、四角校准、识别预览
- 明确不保存进度
- 明确不做多板自动识别
- 明确不做云同步、自动纠错、实时摄像头
- 所有关键行为都有测试入口
- MCP 和真机验收在实现后执行
