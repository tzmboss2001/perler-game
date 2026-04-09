# 单板模式第十九阶段：任务型工具条

## 本次目标
- 将单板模式右侧工具区继续收成任务工作台入口。
- 在单板模式中增加一个更明确的主动作按钮：
  - 进行中时：`完成板N`
  - 当前板已完成且存在下一块时：`继续板N`
  - 全部完成时：`收尾`
- 保持 `图纸 / 辅助` 两个工具入口不变。

## 实现内容
1. 新增单板工具条主按钮 `handleSingleBoardToolbarPrimaryAction`
- 单板未完成：执行 `handleToggleBoardDone()`
- 当前板已完成且存在下一块：执行 `activateBoard(nextPendingBoardNumber, true)`
- 全部完成：展开总览并调用 `handleOpenExport()`

2. 单板模式工具条新增主按钮
- 单板模式下工具区顺序为：
  - `收尾 / 完成板N / 继续板N`
  - `图纸`
  - `辅助`

3. 修复运行时错误
- 原始实现把 `handleSingleBoardToolbarPrimaryAction` 放在 `handleOpenExport` 之前声明，导致页面报错：
  - `ReferenceError: Cannot access 'handleOpenExport' before initialization`
- 现已将主按钮回调移动到 `handleOpenExport` 之后定义，消除 TDZ 问题。

## MCP 验证
### 验证环境
- 页面：`/mobile/making`
- 模式：`单板模式`
- 状态：`全部板已完成`

### 验证结果
1. 页面重载后不再白屏，制作模式可正常渲染。
2. 单板工具区成功显示：
- `适板`
- `收尾`
- `图纸`
- `辅助`
3. 点击 `收尾` 后，导出弹窗可正常打开，说明主按钮链路已接通。
4. 截图已保存：
- `TEMP/single_board_phase19_toolbar.png`

## 当前剩余项
1. 单板模式顶部仍可继续减薄。
2. 工具区还可以继续任务化，例如在不同状态下合并或弱化重复入口。
3. 全部完成后的后续动作仍可继续产品化，例如分享、回编辑、导出后的回流提示。

## 下一步
- 第二维继续收口单板模式顶部与工具区，减少非核心占位。
- 进一步产品化全部完成后的后续动作体验。
