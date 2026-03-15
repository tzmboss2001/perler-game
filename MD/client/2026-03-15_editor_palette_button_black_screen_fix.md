# 编辑页色系按钮点击黑屏修复

- 日期：2026-03-15
- 范围：客户端

## 问题

在编辑图案页面点击“色系”后页面黑屏。
MCP 复现后，控制台报错：
- `ReferenceError: handleApplyCurrentColorSettings is not defined`

根因是色系面板里的“应用当前色系设置”按钮仍绑定旧函数名，但实际可用函数已经改为 `handleApplyPaletteSettings`。

## 修复

- 将 `EditorPage.tsx` 中按钮的 `onClick` 从 `handleApplyCurrentColorSettings` 改为 `handleApplyPaletteSettings`

## 结果

- 点击“色系”不再触发运行时异常
- 色系面板可以正常展开
- “应用当前色系设置”按钮恢复可用
