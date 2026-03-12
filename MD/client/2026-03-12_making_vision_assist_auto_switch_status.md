# 制作页视觉辅助：自动切板确认中与冷却中状态反馈

## 日期
- 2026-03-12

## 目标
- 让用户知道自动切板当前是在：
  - 等待第二次确认
  - 还是处于切板冷却中
- 避免真机使用时出现“系统没反应”的误解。

## 本次修改
- 文件：[BoardVisionAssistModal.tsx](/D:/work/web/perler-beads-creator/perler-beads/src/components/BoardVisionAssistModal.tsx)

### 1. 新增自动切板状态文案
- 新增：
  - `getAutoSwitchPendingText()`
  - `getAutoSwitchCooldownText()`

- 当前会显示两类状态：
  - `正在确认板X 1/2`
  - `自动切板冷却中 2秒`

### 2. 自动切板状态进入条件
- 当候选板分数明显高于当前板，但还没有达到连续确认次数时：
  - 显示 `正在确认板X n/2`

- 当候选板分数已足够，但仍处于切板冷却时间内时：
  - 显示 `自动切板冷却中 X秒`

### 3. 自动清空时机
- 以下情况会清空自动切板状态：
  - 已完成切板
  - 手动切板
  - 重置校准
  - 当前帧不再满足自动切板条件

### 4. 样式
- 新增 `metaHintStrong`
- 用较亮的绿色强调这类状态提示，但仍放在 `自动切板` 卡片内部，不额外挤占布局

## 验证

### 本地构建
- 命令：`cmd /c npm run build`
- 结果：通过

### 本地代码检查
- 已确认以下关键点存在：
  - `autoSwitchStatus`
  - `getAutoSwitchPendingText`
  - `getAutoSwitchCooldownText`
  - `metaHintStrong`

### MCP 验证边界
- 当前 MCP 环境里摄像头不可用，所以无法真实驱动自动轮询进入“确认中 / 冷却中”状态。
- 但这轮代码路径已经接通，并且不影响现有：
  - 双板入口
  - 手动切板提示
  - 自动切板防抖逻辑

## 结果
- 多板视觉辅助现在除了“切完告诉你”，也能在切板前告诉你：
  - 系统正在确认
  - 或者系统正在冷却
- 这一步主要提升自动切板过程的可解释性。
