# 手动编辑工具实现

## 日期
2026-01-23

## 功能描述
为编辑器添加手动编辑工具，支持触摸（手机）和鼠标（桌面）操作。

## 新增文件

### 1. src/store/editorStore.ts
使用 Zustand 管理编辑器状态：
- `currentTool`: 当前工具（brush/fill/eraser/picker）
- `currentColor`: 当前选中的颜色
- `beadData`: 珠子数据
- `history`: 历史记录数组（用于撤销/重做）
- `historyIndex`: 当前历史位置
- 方法：`undo()`, `redo()`, `saveToHistory()`, `setBeadAt()`, `floodFill()`

### 2. src/components/EditorToolbar.tsx
编辑工具栏组件：
- 颜色选择按钮（显示当前颜色和色号）
- 工具按钮组：画笔、填充、橡皮擦、吸色器
- 撤销/重做按钮（根据历史状态启用/禁用）

### 3. src/components/ColorPicker.tsx
颜色选择器弹窗：
- 搜索框（支持搜索颜色名称、中文名、色号）
- 最近使用颜色（最多10个）
- 全部颜色网格（显示当前品牌所有颜色）
- 当前选中颜色信息显示

### 4. src/components/InteractiveCanvas.tsx
交互式Canvas组件：
- 支持鼠标事件（mousedown, mousemove, mouseup）
- 支持触摸事件（touchstart, touchmove, touchend）
- 支持滚轮缩放
- 缩放控制按钮（+/-/100%/1:1）

## 工具功能

| 工具 | 图标 | 功能 | 操作方式 |
|------|------|------|----------|
| 画笔 | 🖌️ | 修改单个珠子颜色 | 点击/拖动绘制 |
| 填充 | 🪣 | 填充相同颜色区域 | 点击触发 |
| 橡皮擦 | 🧽 | 清除为白色 | 点击/拖动擦除 |
| 吸色器 | 💉 | 拾取珠子颜色 | 点击拾取 |

## 跨平台支持

### 触摸操作（手机）
- 单指点击/拖动：编辑珠子
- 双指缩放：放大/缩小画布（待实现）

### 鼠标操作（桌面）
- 左键点击/拖动：编辑珠子
- 滚轮：缩放画布
- 右键拖动：平移画布（待实现）

## 历史记录
- 最多保存 50 步历史
- 每次编辑操作完成后保存
- 支持撤销/重做

## 截图
- TEMP/editor_with_tools.png - 编辑工具栏
- TEMP/color_picker.png - 颜色选择器弹窗

## 下一步
- 添加键盘快捷键（Ctrl+Z 撤销，Ctrl+Y 重做）
- 添加双指缩放手势
- 添加画布平移功能
