# 制作页视觉辅助：自动识别四角增加可信度提示

## 本次目标
- 在自动识别四角成功后，告诉用户这次自动框选的可信度高不高。
- 避免用户不知道当前自动识别结果是否稳，只能盲目继续下一步。

## 改动内容
1. 在 `visionAssistService.ts` 中新增：
   - `VisionCornerDetectConfidence`
   - `VisionCornerDetectResult.confidence`
2. 在 `detectBoardCornersDetailed()` 中根据以下信息计算可信度：
   - 板子在画面中的占比
   - 行列边界能量强度
   - 四条边的几何稳定性
3. 输出三级可信度：
   - `high`
   - `medium`
   - `low`
   同时带一个 `score` 分值。
4. 在 `BoardVisionAssistModal.tsx` 中新增 `getAutoCornerConfidenceText()`。
5. 自动识别四角成功后：
   - 成功提示不再是固定文案
   - 会改成带可信度的提示，例如：
     - 可信度高：可直接继续空板取样
     - 可信度一般：建议先目测一遍
     - 可信度偏低：建议先手动微调四角
6. 当四角已识别、但还没取空板时，视频区域下方会持续显示一条可信度提示条。
7. 如果用户继续手动补点或重置校准，会清掉之前的自动识别可信度，避免误导。

## MCP 验证
### 服务验证
- 直接在浏览器上下文导入 `visionAssistService.ts`
- 构造一张合成拼豆板画面调用 `detectBoardCornersDetailed()`
- 返回结果：
  - `hasCorners = true`
  - `reason = null`
  - `confidence = { level: medium, score: 71 }`
- 说明自动识别四角现在不仅能返回角点，还能返回可信度信息。

## 构建结果
- `npm run build` 通过

## 当前状态
- 仅完成本地版本
- 暂未发布公网
