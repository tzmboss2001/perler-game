# 制作模式复位视图按焦点层级定位

## 问题
- 复位按钮之前本质上仍偏向“回到当前板”。
- 这不符合实际制作流程。
- 用户如果已经选中了区块或最小单元格，复位应回到当前工作焦点，而不是退回到板级。

## 修改
- 调整 `MakingPage.tsx` 中 `resetCurrentView` 的优先级：

### 1. 最小单元格优先
- 当 `selection.type === "color"` 且存在 `selectedCell` 时：
  - 复位到当前选中的单元格中心
  - 缩放倍数不变

### 2. 区块其次
- 当 `selection.type === "block"` 时：
  - 通过 `getBlockRectBySelection(...)` 取当前区块矩形
  - 复位到当前区块中心

### 3. 板级兜底
- 只有在没有更具体的焦点时：
  - 单板模式回到 `activeBoardRect`
  - 传统模式回到 `currentBoardRect`

## 结果
- 复位功能现在遵循：
  - 单元格 > 区块 > 板块
- 更符合实际制作时“回到刚才正在做的地方”的预期。
