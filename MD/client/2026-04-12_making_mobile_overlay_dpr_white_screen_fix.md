# 2026-04-12 制作模式手机端 >200% 白屏修复

## 问题
- 制作模式在手机端缩放到 200% 以上时，真实设备会出现白屏。
- MCP 桌面模拟器不一定直接白屏，但抓到 overlay canvas 内部尺寸被拉到 14400x17640，远超安全范围。

## 根因
- 底图 canvas 已经通过 `getSafeRenderMetrics` 降采样并限制 DPR。
- overlay 高亮层仍然直接使用 `window.devicePixelRatio` 作为 backing store DPR。
- 在 3x 手机 DPR 下，overlay 画布尺寸暴涨，容易在真实手机上触发 canvas/GPU 内存极限，出现白屏。

## 修复
- `MakingPage.tsx`
  - overlay 渲染层改为复用 `renderDpr`，与底图 canvas 共用同一套安全 DPR 预算。
  - 不再直接使用原始 `window.devicePixelRatio`。

## 结果
- overlay 与底图的内部像素预算统一。
- 手机端在高倍率下不再因为 overlay backing store 过大而触发白屏。
