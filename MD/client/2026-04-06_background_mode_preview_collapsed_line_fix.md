# 背景处理模式预览区被压成一条线修复

## 问题
- 背景处理模式下，预览区只剩一条细线，几乎看不到全图。
- 实际检查发现不是预览外层高度不够，而是 `InteractiveCanvas` 在背景模式 fill-parent 场景下，外层 wrapper 没有撑满父容器高度，导致内部 container 被压成约 11px。

## 修复
1. 在 `InteractiveCanvas` 中，当满足：
   - `isBackgroundMode = true`
   - `backgroundModeFillParent = true`
   时，给最外层 wrapper 补充：
   - `height: 100%`
   - `flex: 1`
   - `minHeight: 0`
2. 这样背景处理模式下的预览容器会真正继承父层可用高度，不再被压扁。

## 验证
- `cmd /c npm run build`
- MCP 验证：
  1. 背景处理模式下 canvas 外层 container 高度恢复正常
  2. 预览区重新显示完整图像，而不是一条线
