# 2026-05-21 删除实时视觉辅助入口与弹层

## 背景

实时摄像头视觉辅助方向已经暂停，不再作为当前产品能力继续呈现。当前保留并推进的是“拍照同步进度”：用户上传或拍摄当前板静态照片，系统给出识别预览，并由用户确认后再保存本地进度。

## 根本原因

原制作页仍保留旧的实时视觉辅助入口和 `BoardVisionAssistModal`，会让用户误以为产品仍支持实时摄像头连续识别。该入口与当前产品路线不一致，也会干扰用户寻找新的“拍照同步”功能。

## 修改范围

- `perler-beads/src/pages/mobile/MakingPage.tsx`
  - 删除 `BoardVisionAssistModal` 引入、`showVisionAssist` 状态、移动端旧视觉辅助入口、桌面端旧视觉辅助按钮和弹层渲染。
  - 桌面端常用工具中的旧“视觉辅助”按钮改为“拍照同步”。
  - 移动端“拍照同步（试验）”按钮文案从“预览”调整为“开始”。
- `perler-beads/src/components/BoardVisionAssistModal.tsx`
  - 删除旧实时摄像头视觉辅助弹层。
- `perler-beads/src/services/visionAssistService.ts`
  - 删除旧实时自动识别当前板使用的 `findBestVisionBoardMatch` 与匹配评分导出。
  - 保留 `analyzeVisionProgress()`、`splitBeadDataIntoBoards()` 等拍照同步仍在使用的静态照片识别能力。
- `perler-beads/src/pages/mobile/PrivacyPolicyPage.tsx`
  - 权限和本地缓存说明改为拍照同步进度，不再写视觉辅助设置。
- `TEST/photo_progress_modal_contract.test.mjs`
  - 契约测试改为要求制作页保留拍照同步入口，并且不再存在旧视觉辅助入口和弹层引用。

## 影响评估

- 会影响：旧实时摄像头视觉辅助入口与弹层无法再打开。
- 不影响：拍照同步上传照片、四角校准、空孔参考、识别预览、用户确认保存。
- 不影响：制作页手势、缩放、拖动边界、切板、复位逻辑。
- 不影响：后端接口与云同步，本次属于前端清理。

## 验证计划

- `node TEST/photo_progress_modal_contract.test.mjs`
- `node TEST/photo_progress_vision_contract.test.mjs`
- `node TEST/photo_progress_service.test.mjs`
- `node TEST/photo_progress_confirmation_model.test.mjs`
- `node TEST/photo_progress_persistence.test.mjs`
- `node TEST/single_board_interaction.test.mjs`
- `node TEST/mobile_immersive_visual_contract.test.mjs`
- `npm run build`
- MCP 手机视口检查工具抽屉中不再出现“视觉辅助”，且“拍照同步（试验）”可以打开。
