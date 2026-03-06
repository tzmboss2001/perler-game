# 2026-03-05 登录页黑屏与乱码修复

## 问题
- MCP 回归在 `http://localhost:3005/mobile/login` 发现控制台报错：`Uncaught ReferenceError: loading is not defined`。
- 登录页存在多处中文乱码文案，影响上线质量与可读性。

## 处理
- 文件：`perler-beads/src/pages/mobile/LoginPage.tsx`
- 修复点：
  - 将提交按钮的 `opacity` 从样式常量中移出，改为 JSX 运行时合并：`style={{ ...styles.submitButton, opacity: loading ? 0.7 : 1 }}`，消除 `loading` 作用域错误。
  - 全量替换登录页可见乱码文案，恢复为正常中文提示与占位文案。

## 验证
- 重新打开登录页，页面恢复渲染，不再黑屏。
- 控制台不再出现 `loading is not defined`。
