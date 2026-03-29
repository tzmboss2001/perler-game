# 2026-03-21 风格与色系按钮打不开修复

## 问题
- 编辑图案页左侧 `色系 / 配色` 与 `风格 / 颜色` 按钮点击无效。
- 控制台同时出现：
  - `setShowMirrorSettings is not defined`
  - `setReplacedColors is not defined`

## 根因
1. 镜像按钮改成直接执行后，`showMirrorSettings` 状态已经移除，但 `EditorPage.tsx` 里仍残留 `setShowMirrorSettings(false)` 调用。
2. 生成图案流程里还残留了一处 `setReplacedColors(new Map())`，但对应状态已不存在。

## 修复
- 删除点击空白关闭面板、打开色系、打开颜色风格时残留的 `setShowMirrorSettings(false)`。
- 删除 `processImage()` 中残留的 `setReplacedColors(new Map())`。

## 结果
- `色系 / 配色` 面板可以正常展开。
- `风格 / 颜色` 面板可以正常展开。
- 控制台不再因为这两个失效引用而报错。
