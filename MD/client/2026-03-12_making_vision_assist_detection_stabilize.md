# 制作页视觉辅助：自动识别结果防抖

## 日期
2026-03-12

## 目标
降低视觉辅助在自动轮询时的识别抖动，避免下一步引导、错放提示和当前优先颜色在连续帧之间频繁跳动。

## 问题
自动轮询每一轮都会直接把最新识别结果写进页面。
在真机轻微抖动、反光变化或遮挡边缘场景下，虽然单帧可以识别，但连续两帧的 guideCells / wrongGuideCells / activeColorId 可能来回波动，导致：
- 下一步建议跳动
- 错放提示来回变化
- 当前优先颜色切换过快

## 方案
对自动识别结果增加一层轻量确认：
- 手动点击 `立即识别` 时，结果仍然立即生效
- 自动轮询时，结果需要连续命中两次才写入页面
- 如果中间切板、重置校准或重新开始识别，则清空待确认结果

## 主要改动
1. 在 `BoardVisionAssistModal.tsx` 新增：
- `DETECTION_CONFIRMATION_COUNT = 2`
- `createDetectionStabilityKey()`
- `pendingDetectionRef`

2. 自动识别写入逻辑调整：
- `source === manual`：立即 `setDetection(result)`
- `source === auto`：
  - 先根据 `activeColorId / matchedCells / missingCells / wrongCells / extraFilledCells / guideCells / wrongGuideCells` 生成稳定 key
  - 相同 key 连续命中两次后再正式更新 detection

3. 状态清理补充：
- 切板时清空 `pendingDetectionRef`
- `resetCalibration()` 时清空 `pendingDetectionRef`

4. 顺手收口的可见文案
- 修复 `已定位到...`
- 修复 `已微调左上角/右上角...`
- 把当前板尺寸的异常连接符改为 `×`

## 涉及文件
- `perler-beads/src/components/BoardVisionAssistModal.tsx`
- `perler-beads/src/services/visionAssistService.ts`

## 验证
### 本地构建
- 执行：`npm run build`
- 结果：通过

### 代码检查
确认以下关键点已接入：
- `DETECTION_CONFIRMATION_COUNT`
- `createDetectionStabilityKey()`
- `pendingDetectionRef`
- 自动轮询与手动识别分流更新

## 当前状态
- 仅本地完成
- 未发布公网
- 这一轮主要是功能稳定性优化，不涉及 UI 布局调整
