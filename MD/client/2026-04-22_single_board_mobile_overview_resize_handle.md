# 2026-04-22 单板模式手机端总览缩放手柄优化

## 本次改动

- 在手机端单板模式总览卡片右下角新增等比例缩放手柄。
- 总览卡片主体继续负责拖动，缩放手柄只负责缩放，避免手势职责混淆。
- 总览卡片缩放后会自动钳回屏幕安全区域，避免超出可视范围。
- 最近一次总览卡片宽度会保存到本地，刷新页面后仍会沿用。

## 修改文件

- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/utils/singleBoardInteraction.js`
- `TEST/single_board_interaction.test.mjs`
- `docs/superpowers/plans/2026-04-22-single-board-mobile-overview-resize.md`

## 关键实现

### 1. helper 扩展

- 新增 `clampSingleBoardMobileOverviewWidth`
- `getSingleBoardMobileOverviewLayout` 支持：
  - `widthOverride`
  - `minWidth`
  - `maxWidth`

### 2. 页面状态

- 新增 `singleBoardMobileOverviewWidth`
- 新增 `singleBoardMobileOverviewResizeRef`
- 总览打开时按当前宽度计算布局
- 宽度通过 `localStorage` 保存到：
  - `making_single_board_mobile_overview_width_v1`

### 3. 交互分流

- 卡片主体 `pointerdown`：拖动卡片
- 右下角手柄 `pointerdown`：缩放卡片
- 缩放与拖动互斥

## 测试与验证

### 自动化测试

执行：

```powershell
node --test TEST\single_board_interaction.test.mjs
```

结果：

- `28/28` 通过

### 构建验证

执行：

```powershell
cd perler-beads
npm.cmd run build
```

结果：

- 构建通过
- 当前构建主包：
  - `assets/index-CiNCzRti.js`

### MCP 页面验证

页面：

- `http://127.0.0.1:3005/mobile/making`

验证项：

1. 打开总览后能看到右下角缩放手柄
2. 拖动手柄后卡片宽度从 `220px` 变为 `256px`
3. 拖动卡片后位置从：
   - `left: 67px / top: 259px`
   变为：
   - `left: 91px / top: 277px`
4. 点下一板后，总览标题同步为：
   - `整图总览 · 当前板 2/2`
5. 刷新页面后再次打开总览，宽度仍保持：
   - `256px`

截图：

- `TEMP/single_board_mobile_overview_resized.png`

## 结论

- 本次总览缩放手柄功能已完成
- 本地自动化、构建、MCP 页面验证均通过
- 本轮尚未正式发布，等待用户确认后再提交和发布
