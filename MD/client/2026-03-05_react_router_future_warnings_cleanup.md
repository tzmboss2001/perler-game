# 2026-03-05 React Router 预警消除

## 问题
- 控制台持续出现 React Router v7 Future Flag 警告，影响测试信噪比。

## 修复
- 文件：`perler-beads/src/router/index.tsx`
- 在 `BrowserRouter` 增加 future 配置：
  - `v7_startTransition: true`
  - `v7_relativeSplatPath: true`

## 验证
- MCP 打开 `/mobile/home` 后，控制台 warn/error 为 0。
- `npm.cmd run build` 通过。
