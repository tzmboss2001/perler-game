# 制作页视觉辅助：自动识别四角失败原因细分

## 本次目标
- 把原本统一的“自动识别四角失败，请改用手动点角校准”拆成更具体的失败原因。
- 让用户知道是画面里没找到板边、板太小，还是板太贴边，而不是只看到一个笼统失败提示。

## 改动内容
1. 在 `visionAssistService.ts` 中新增：
   - `VisionCornerDetectFailureReason`
   - `VisionCornerDetectResult`
   - `detectBoardCornersDetailed()`
2. 详细识别结果支持以下失败原因：
   - `no_edges`：画面里没找到清晰板边
   - `board_too_small`：拼豆板在画面里太小
   - `board_too_large`：拼豆板太贴边或超出画面
3. 保留原有 `detectBoardCorners()`，内部改为复用详细结果，避免影响其他调用面。
4. 在 `BoardVisionAssistModal.tsx` 中把自动识别四角入口改为读取详细失败原因，并显示对应提示：
   - 没找到板边：请把拼豆板放完整、背景更干净后再试
   - 板太小：请把镜头靠近一些再试
   - 板太大：请把镜头拉远一些再试
   - 兜底仍保留原有通用失败提示

## 验证
- `npm run build` 通过
- 代码路径校验通过：
  - `detectBoardCornersDetailed`
  - `VisionCornerDetectFailureReason`
  - `getAutoCornerFailureMessage`
  - 自动识别入口已改为读取 `detectResult.reason`

## 当前状态
- 仅完成本地版本
- 暂未发布公网
