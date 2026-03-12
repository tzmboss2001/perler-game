# 制作页视觉辅助：自动切板状态最短显示时长

## 日期
- 2026-03-12

## 目标
- 避免自动切板的状态提示一闪而过。
- 让“确认中 / 冷却中”至少显示一段时间，用户能真正看清。

## 本次修改
- 文件：[BoardVisionAssistModal.tsx](/D:/work/web/perler-beads-creator/perler-beads/src/components/BoardVisionAssistModal.tsx)

### 1. 新增最短显示时长
- 常量：
  - `AUTO_SWITCH_STATUS_MIN_MS = 1400`

- 作用：
  - 自动切板状态一旦出现，至少保留约 `1.4s`
  - 即使下一帧条件不再满足，也不会立刻消失

### 2. 状态更新改成统一入口
- 新增：
  - `updateAutoSwitchStatus(nextStatus)`

- 这层逻辑负责：
  - 立即显示新状态
  - 延迟清理旧状态
  - 防止轮询过快导致状态闪烁

### 3. 新增定时器清理
- 新增引用：
  - `autoSwitchStatusShownAtRef`
  - `autoSwitchStatusClearTimerRef`

- 在以下情况会清理：
  - 重置校准
  - 手动切板
  - 弹层卸载

## 验证

### 本地构建
- 命令：`cmd /c npm run build`
- 结果：通过

### MCP 回归
- 页面：`http://127.0.0.1:3005/mobile/making?test=1`
- 回归确认：
  - 视觉辅助弹层仍可正常打开
  - 点击 `板2` 后仍显示：
    - `已切到板2`
  - `当前板尺寸` 仍会同步切到 `1 × 20`

### 当前验证边界
- MCP 环境仍然没有摄像头权限，所以不能真实驱动出“确认中 / 冷却中”的动态状态。
- 但这轮代码路径已接通，并已保证：
  - 手动切板不回归
  - 现有状态提示不回归

## 结果
- 自动切板状态现在不会因为轮询太快而一闪而过。
- 这一步主要提升真机使用时的可读性和稳定感。
