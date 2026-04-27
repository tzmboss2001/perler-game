# 2026-04-27 编辑页调节区横向重排

## 背景

编辑页的 `预览缩放` 和 `宽度` 控件原本上下堆叠，占用了过多纵向空间，导致 `保存并开始制作` 在常见手机首屏下需要下滑才能看到。

## 本次修改

- 新增 `perler-beads/src/utils/editorControlLayout.ts`
  - 抽出编辑页调节区布局规则。
  - `390` 及以上视口切到左右两列。
  - `389` 及以下维持上下堆叠。
- 修改 `perler-beads/src/pages/mobile/EditorPage.tsx`
  - 把 `预览缩放` 和 `宽度` 区域接入响应式两列布局。
  - 左右宽度按 `44% / 56%` 分配。
  - 收紧了横向布局下的滑杆、步进按钮和宽度快捷标记尺寸。
  - 保留 `适配 / 1:1`、宽度输入框、滑杆和常用宽度按钮，不改生成逻辑。

## 验证

- `cmd /c node --test TEST\editor_control_layout.test.mjs`
  - `2/2` 通过
- `cmd /c npm.cmd run build`
  - 通过
- MCP 本地页面验证
  - 页面：`http://127.0.0.1:3008/mobile/create -> 裁剪 -> 编辑图案`
  - 口径：`390x844x3`
  - `预览缩放` 与 `宽度` 在同一行，位置分别约为 `x=19` 和 `x=180`
  - `保存并开始制作` 位于首屏内，约 `y=652`
  - 截图：`TEMP/editor_controls_horizontal_layout.png`
