# 2026-03-21 编辑页控制区紧凑布局与右侧数值对齐

## 问题
- 编辑图案页下方控制区高度偏大，导致“保存并开始制作”按钮在部分屏幕里位置偏低。
- 右侧的预览缩放百分比与宽度数值没有形成统一对齐列，视觉上不整齐。

## 修改
- 压缩控制区整体垂直间距：
  - `controlPanel` padding 从 `10px` 调整为 `8px 8px 6px`
  - `controlPanel` 底部间距从 `8px` 调整为 `6px`
  - `controlItem` 间距从 `8px` 调整为 `6px`
  - `controlHeader` 底部间距从 `8px` 调整为 `6px`
  - `actions` 底部 padding 调整为 `0`
- 统一右侧数值显示列：
  - `controlValue` 固定为 `64px` 宽并右对齐
  - 宽度输入框保持 `64px` 宽，透明背景、无边框、右对齐
  - 宽度输入框高度改为自动，视觉上更像纯数值显示

## 影响文件
- `perler-beads/src/pages/mobile/EditorPage.tsx`

## 结果
- 下方编辑区更紧凑，主按钮整体上移。
- 右侧 `10% / 240` 这类数值会落在统一的右边界上。

## 验证
- 执行 `cmd /c npm run build`，构建通过。
