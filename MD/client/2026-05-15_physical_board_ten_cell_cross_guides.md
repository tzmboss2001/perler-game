# 2026-05-15 现实豆板 10x10 区块十字虚线辅助

## 背景

用户提出真实豆板每个 10x10 小格区块内还有十字虚线，用于帮助数格子。当前制作页和导出图纸已有现实豆板分区线，但缺少每个完整 10x10 区块内部的十字虚线辅助。

## 修改内容

- 在 `perler-beads/src/services/boardService.ts` 新增 `getPhysicalBoardTenCellCrossGuides()`，统一计算每块现实豆板内完整 10x10 区块的十字线范围和中心坐标。
- 在 `perler-beads/src/pages/mobile/MakingPage.tsx` 的 overlay canvas 中接入十字虚线辅助：
  - 仅当屏幕小格尺寸达到可读阈值时显示；
  - 线条为弱对比虚线；
  - 不覆盖当前选中格、高亮色边框和板边界视觉层级。
- 在 `perler-beads/src/services/colorMatchService.ts` 中接入导出图纸绘制：
  - 普通 PNG 图纸显示十字虚线；
  - 带清单 PNG 图纸显示十字虚线；
  - 分板 PNG 图纸显示十字虚线；
  - overview 总览图保持不显示，避免总览信息过密。

## 新增测试

- `TEST/physical_board_guides.test.mjs`
  - 验证 54 板只为完整 10x10 区块生成 25 个十字辅助；
  - 验证边缘 2 格补偿区不会生成十字辅助。
- `TEST/physical_board_guides_visual_contract.test.mjs`
  - 验证制作页 overlay 和导出渲染都使用共享几何函数；
  - 验证两处都使用 dashed line 绘制。

## 验证结果

- `cmd /c node --test TEST\physical_board_guides.test.mjs`：通过。
- `cmd /c node --test TEST\physical_board_guides_visual_contract.test.mjs`：通过。
- `cmd /c node --test TEST\single_board_interaction.test.mjs`：52 项通过。
- `cmd /c node --test TEST\export_modal_visual_contract.test.mjs`：2 项通过。
- `cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_clean --emptyOutDir`：通过，仅有既有 chunk size 警告。
- `cmd /c node TEST\paginated_zip_download_smoke.mjs`：通过，仍然下载单个 ZIP。

## 手测记录

- 本地制作页截图：`TEMP/physical_board_ten_cell_cross_guides_local_20260515.png`
- 真实导出 ZIP：`TEMP/paginated-zip-download-smoke/perler-60x30-boards-20260515.zip`
- 解压后的导出图纸：`TEMP/paginated-zip-download-smoke/extracted-ten-cell-cross/perler-60x30-board1-p1of2-20260515.png`

## 影响范围

- 仅影响制作页视觉 overlay 和导出 PNG 的辅助线绘制。
- 不影响颜色匹配、换色、选格、高亮状态、自动跳下一板、完成状态、ZIP 打包格式和后端接口。

## 回滚方式

如需回滚，移除以下改动并重新 build：

- `boardService.ts` 中的 `PhysicalBoardTenCellCrossGuide` 和 `getPhysicalBoardTenCellCrossGuides()`。
- `MakingPage.tsx` 中的 `getPhysicalBoardTenCellCrossGuides` import 与十字虚线绘制块。
- `colorMatchService.ts` 中的 `getPhysicalBoardTenCellCrossGuides` import、`drawTenCellCrossGuides()` 和三处调用。
- 删除本次新增的两个测试文件。
