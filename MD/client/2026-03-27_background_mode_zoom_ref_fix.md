# 2026-03-27 背景处理模式缩放引用修复

## 问题
- 去背景页面已经显示了独立的“预览缩放”控件。
- 但实际操作 `+ / - / 适配 / 1:1 / 滑杆` 时，背景处理模式里的预览图没有变化。

## 根因
- 编辑页主预览使用 `interactiveCanvasRef`。
- 背景处理模式里的缩放控件也误用了同一个 `interactiveCanvasRef`。
- 背景处理模式自己的 `InteractiveCanvas` 没有绑定独立 ref，导致控件实际上在操作底层编辑预览，而不是当前背景处理预览。

## 修复
- 新增 `bgInteractiveCanvasRef`。
- 背景处理模式内的 `InteractiveCanvas` 绑定 `ref={bgInteractiveCanvasRef}`。
- 背景处理模式下的 `+ / - / 适配 / 1:1 / 滑杆` 全部改为调用 `bgInteractiveCanvasRef.current`。

## 结果
- 去背景页面的缩放控件现在直接作用于当前背景处理预览。
- 预览放大缩小和适配、1:1 逻辑与编辑页保持一致。
