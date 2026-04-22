# 单板模式手机端总览入口与浮层体验优化

## 问题

用户在单板模式手机端遇到两个体验问题：

1. 真机上单块图时看不到“看总览图”按钮，容易误以为手机端没有总览能力。
2. 多板图打开总览后，浮层固定贴在底部，小屏和竖图场景下容易显示不全并遮挡制作区。

## 方案

- 手机端单板模式下，只要当前有活动板块，就显示总览入口，不再限制为多板图才显示。
- 总览浮层从底部固定改为居中自适应卡片。
- 卡片使用轻半透明背景，缩略图主体保持清晰。
- 允许通过标题栏拖动卡片位置，但不允许直接拖动画布区域，避免和总览点击跳板、制作手势冲突。
- 左右切板箭头只在多板图时显示；单块图也能打开总览，但不显示箭头。

## 代码修改

### 1. 新增纯函数

文件：
- `perler-beads/src/utils/singleBoardInteraction.js`

新增：
- `shouldShowSingleBoardMobileOverviewButton`
- `getSingleBoardMobileOverviewLayout`
- `clampSingleBoardMobileOverviewOffset`

用途：
- 统一控制手机端总览入口是否显示
- 统一计算居中浮层的自适应尺寸和位置
- 统一限制拖拽后的卡片偏移，避免拖出视口

### 2. 接入制作页

文件：
- `perler-beads/src/pages/mobile/MakingPage.tsx`

调整：
- 手机端单板模式总览按钮文案改为更短的 `总览`
- 按钮不再只依赖 `totalBoardCount > 1`
- 浮层改为 `fixed + 居中布局`
- 加入仅标题栏可拖动的 pointer 交互
- 单块图时隐藏左右箭头

## 测试

### 自动化

- `node --test TEST\single_board_interaction.test.mjs`
  - 结果：`25/25` 通过

- `npm.cmd run build`
  - 结果：通过

### MCP 页面级验证

页面：
- `http://127.0.0.1:3005/mobile/making`

口径：
- `390x844x3`
- iPhone Safari UA

验证结果：
- 单板模式下能看到 `总览` 按钮
- 打开后总览卡片默认居中，不再钉死底部
- 标题栏拖动后卡片位置会变化
- 总览画布仍可正常显示和点击

截图：
- `TEMP/single_board_mobile_overview_centered.png`
- `TEMP/single_board_mobile_overview_dragged.png`

## 当前结论

- 手机端单板模式现在有更稳定、可发现的总览入口
- 总览浮层默认位置更合理，不再直接压在底部
- 已提供受控拖动能力，但仍保留总览点击跳板的交互稳定性
