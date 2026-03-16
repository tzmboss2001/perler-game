# 2026-03-16 制作模式空格点击导致黑屏修复

## 问题
- 制作模式页面出现黑屏。
- 控制台报错：`Cannot read properties of null (reading 'id')`。

## 原因
- 制作模式在放大状态下点击格子时，会直接读取 `bead.id` 和 `bead.hex`。
- 但图案数据里存在透明格/空格，`bead` 可能为 `null`。
- 同类问题还存在于颜色替换逻辑里，遍历时也直接读取了 `bead.hex`。

## 修复
- 在鼠标点击和触摸点击分支中，遇到 `null` 格子时直接清空当前颜色选中并返回。
- 在颜色替换逻辑中增加 `bead` 判空保护。

## 修改文件
- `perler-beads/src/pages/mobile/MakingPage.tsx`

## 结果
- 点击透明格不会再触发 `null.id` / `null.hex` 报错。
- 制作模式不再因空格点击而黑屏。
