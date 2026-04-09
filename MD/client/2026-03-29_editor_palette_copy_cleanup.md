# 2026-03-29 编辑页色系设置文案收口

## 问题
- 色系设置面板摘要显示为“当前291色，我的颜色283”，信息过多。
- “291色全开，极致还原”文案冗余。
- 面板底部“应用当前色系设置”按钮语义不清，与点击色数即时生效的交互重复。

## 本次修改
1. 编辑页色系设置摘要改为更直接的显示：
   - 系统色系模式下仅显示“当前X色”。
2. 删除色系设置面板中基于 `description/detailDesc` 的提示文案展示。
3. 删除面板底部“应用当前色系设置”按钮。
4. 清理不再使用的 `currentColorOption` 和 `handleApplyPaletteSettings` 代码。
5. 同步将 291 色选项描述改成更中性的“当前系统全部颜色”，避免残留“全开/极致还原”措辞。

## 影响文件
- `perler-beads/src/pages/mobile/EditorPage.tsx`
- `perler-beads/src/data/beadColors.ts`

## 验证
- `cmd /c npm run build` 通过。
