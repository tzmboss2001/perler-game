# 2026-04-08 制作模式高亮绘制辅助函数漏定义修复

## 问题
在制作模式 overlay 覆盖层重构后，绘制网格与高亮时调用了 `drawVLine` 和 `drawHLine`，但当前 effect 作用域内没有定义这两个辅助函数，导致运行时报错 `drawVLine is not defined`，进而影响高亮层重绘与缩放时的视觉同步判断。

## 修复
1. 在 overlay 渲染 effect 内补充 `drawVLine` 和 `drawHLine`。
2. 两个函数统一按当前 `dpr` 做像素对齐后再绘制。
3. 复用同一个 `snapCanvasCoord`，确保网格线、板线和高亮边界都走一致的像素对齐策略。

## 结果
overlay 渲染不再因辅助函数缺失而中断，后续缩放同步和高亮偏移问题可以在正常渲染前提下继续验证。
