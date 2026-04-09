# 2026-04-07 制作模式区块选择改为现实豆板分区

## 问题
- 制作模式里豆板画线已经按现实豆板规则绘制。
- 但点击选区块仍按固定 10x10 网格划分。
- 两套规则叠加后，红色区块框会和现实豆板分区线打架，容易干扰用户。

## 处理
- 在 `boardService.ts` 新增：
  - `getPhysicalBoardSegments`
  - `getPhysicalBoardBlockCoordinate`
  - `getPhysicalBoardBlockRect`
- 在 `MakingPage.tsx` 中将以下逻辑统一改成按现实豆板分区计算：
  - 区块总数
  - 点击选区块
  - 选中区块范围
  - 当前区块中心锚点
  - 当前区块内颜色统计
  - 切换到某块板后的默认区块定位
- 这样 54 板会按 `2/10/10/10/10/10/2` 划分，78 板按 `4/10/.../4` 划分，边缘区块会是现实里的小长方形，不再被强行画成正方形。

## 结果
- 区块选择与豆板画线使用同一套现实规则。
- 红色区块线不再与豆板分区线构成两套不同坐标体系。
- 用户看到的选区逻辑更接近真实拼豆制作方式。

## 验证
- `cmd /c npm run build` 通过。
- MCP 截图：`TEMP/making_physical_block_selection_fix.png`
