# 2026-03-25 编辑页预览区增高与编辑区下移

## 变更目的
- 编辑图案页中，`保存并开始制作` 按钮下方仍有可用空间。
- 将更多垂直空间还给预览区，让图案在手机端更清楚。
- 通过缩小预览区外层留白，让控制区自然下移，而不是单独硬调按钮位置。

## 本次修改
- `InteractiveCanvas.tsx`
  - 提高编辑页预览区默认高度到 `60vh`。
  - 将编辑页预览区最小高度提高到 `380px`。
  - 将编辑页预览区最大高度提高到 `70vh`。
  - 背景处理模式同步提高到 `58vh / 350px / 66vh`。
- `EditorPage.tsx`
  - 缩小 `previewSection` 的上下左右内边距。
  - 缩小预览区下方到控制区之间的外层留白，让控制区整体下移。

## 涉及文件
- `perler-beads/src/components/InteractiveCanvas.tsx`
- `perler-beads/src/pages/mobile/EditorPage.tsx`

## 验证
- `npm run build`
