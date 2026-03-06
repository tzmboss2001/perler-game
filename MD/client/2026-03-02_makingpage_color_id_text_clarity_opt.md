# 2026-03-02 制作页色号文字清晰度优化

## 问题
- 在 `MakingPage` 放大到 6 倍时，格子内色号文字出现明显像素感。

## 原因
- 画布 CSS 使用了 `imageRendering: pixelated`，该设置会让整张 Canvas（包含文字）一起像素化。

## 修复
- 文件：`perler-beads/src/pages/mobile/MakingPage.tsx`
- 改动：
  1. `canvas` 样式 `imageRendering` 从 `pixelated` 改为 `auto`。
  2. 绘制时显式开启 `ctx.imageSmoothingEnabled = true`。
  3. 色号字体栈优化为：`PingFang SC / Microsoft YaHei / Segoe UI`，提升中文与字母数字边缘质量。

## 验证
- 执行：`cmd /c npm run build`
- 结果：构建通过。

## 影响
- 保持现有样式结构不变，仅提升 6 倍放大时文字观感。
- 色块与网格逻辑不变。
