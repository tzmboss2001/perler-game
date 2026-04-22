# 单板模式手机端总览缩小与当前板同步强化

## 问题

在上一版手机端总览改造后，又暴露出三点体验问题：

1. 总览卡片仍然偏大，抢制作区注意力。
2. 用户希望可以直接拖动总览卡片本体，而不只是标题栏。
3. 点 `<` / `>` 切板后，总览里虽然逻辑上会切换当前板，但视觉提示过弱，用户不容易感知当前正在制作的是哪一块板。

## 本次处理

### 1. 总览卡片继续缩小

文件：
- `perler-beads/src/utils/singleBoardInteraction.js`
- `perler-beads/src/pages/mobile/MakingPage.tsx`

调整：
- 手机端总览卡片默认宽度从上一版的大卡片收缩到约 `220px`。
- 最大高度同步收缩到约 `280px`。
- 总览主体仍保持整图显示，不改成只看局部板。

### 2. 总览卡片允许整卡拖动

文件：
- `perler-beads/src/pages/mobile/MakingPage.tsx`

调整：
- 改为整卡可拖动，不再只限标题栏。
- 加入拖动阈值判断：
  - 小位移仍按点击处理
  - 超过阈值才认定为拖动
- 这样拖动总览卡片不会误吞掉总览内部的点击跳板。

### 3. 当前板同步提示强化

文件：
- `perler-beads/src/utils/singleBoardInteraction.js`
- `perler-beads/src/pages/mobile/MakingPage.tsx`

调整：
- 总览标题改为明确显示：
  - `整图总览 · 当前板 1/2`
  - `整图总览 · 当前板 2/2`
- 总览画布对非当前板区域增加更明显的淡化遮罩。
- 当前板边框加粗，并增加内层亮边，提升切板后的感知度。

## 测试

### 自动化

- `node --test TEST\single_board_interaction.test.mjs`
  - 结果：`26/26` 通过

- `npm.cmd run build`
  - 结果：通过

### MCP 页面级验证

页面：
- `http://127.0.0.1:3005/mobile/making`

验证结果：
- 总览按钮仍可打开手机端总览卡片
- 总览卡片尺寸比上一版更小
- 卡片位置可被拖动
- 点 `<` / `>` 后，总览标题会从 `当前板 2/2` 切到 `当前板 1/2`
- 总览高亮感知比上一版更明确

截图：
- `TEMP/overview_small_board1.png`
- `TEMP/overview_small_board2_to_1.png`

## 结论

- 手机端总览现在更像“辅助定位小窗”，不再过度压制主制作区。
- 当前正在制作的板已经有更明确的同步反馈，不再只靠微弱边框变化让用户猜。
