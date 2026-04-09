# 编辑页预览比例失真修复

时间：2026-04-03

## 问题
编辑图案页在最大宽度等高倍率场景下，预览图会出现比例失真；制作模式里比例正常，说明问题出在编辑页预览显示层，而不是图案数据本身。

## 根因
`InteractiveCanvas` 直接把浮点逻辑尺寸同时写给 canvas 属性尺寸和 CSS 显示尺寸，而 `renderBeadsToCanvas` 内部又会再次重设 canvas 宽高。这样在高倍率和高 DPI 屏幕下，会出现 canvas backing store 与 CSS 展示尺寸不一致，导致编辑页预览显示层拉伸失真。

## 修复
1. 给 `renderBeadsToCanvas` 增加 `pixelRatio` 支持。
2. canvas 内部改成按 `pixelRatio` 设置 backing store 尺寸。
3. canvas CSS 宽高只保留逻辑显示尺寸。
4. `InteractiveCanvas` 改为调用 `renderBeadsToCanvas(..., { pixelRatio })`，并移除 JSX 上直接写死的 `width/height` 属性，避免与渲染函数重复设置。

## 结果
编辑页预览改为“逻辑尺寸等比显示 + 高分屏 backing store 渲染”，最大宽度场景下不再因为内部尺寸和 CSS 尺寸脱节而拉伸变形。
