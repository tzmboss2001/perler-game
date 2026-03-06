# 2026-03-04 MCP回归附带修复：Editor 统计区嵌套按钮错误

## 问题
- MCP 控制台发现 React 报错：`<button> cannot contain a nested <button>`。
- 位置在编辑页“珠子统计”头部：外层可点击区域是 `button`，内部“合并”也是 `button`。

## 修复
- 文件：`perler-beads/src/pages/mobile/EditorPage.tsx`
- 将外层统计头由 `button` 改为可访问的 `div`：
  - `role="button"`
  - `tabIndex={0}`
  - 增加 Enter/Space 键盘触发逻辑
- 保留内部“合并”按钮为独立 `button`，并继续 `stopPropagation()`。

## 验证
1. `npm.cmd run build` 通过。
2. `npm.cmd run quality:gate` 通过。
3. MCP 重新加载 `/mobile/editor` 后控制台不再出现 nested button 报错。

## 影响
- 消除控制台结构性错误，避免潜在 hydration/可访问性问题。
- 功能行为不变：统计区可展开收起，合并按钮可独立点击。