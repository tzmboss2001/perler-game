# 2026-03-05 全局乱码清理与色系文案对齐回归

## 问题背景
- 之前排查中发现：
  - 欢迎引导/帮助页色系文案存在不一致（实际已是 MARD，但部分说明未统一）。
  - 多个页面源码中存在注释乱码（历史编码污染）。
  - 制作页存在 1 处用户可见提示文案乱码（toast 文案）。

## 本次修改

### 1) 色系文案统一为 MARD
- 文件：`perler-beads/src/components/OnboardingModal.tsx`
  - 第三屏文案统一为 MARD 色系说明。
- 文件：`perler-beads/src/pages/mobile/HelpPage.tsx`
  - 教程和 FAQ 中色系描述统一为 MARD（291色）。

### 2) 全局乱码清理（本轮涉及文件）
- `perler-beads/src/router/index.tsx`
- `perler-beads/src/components/OnboardingModal.tsx`
- `perler-beads/src/pages/mobile/HelpPage.tsx`
- `perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- `perler-beads/src/pages/mobile/ProfilePage.tsx`
- `perler-beads/src/pages/mobile/MakingPage.tsx`

处理方式：
- 将乱码注释全部改为正常中文注释；
- 不改业务逻辑，仅清理可读性与维护性问题。

### 3) 修复用户可见乱码
- 文件：`perler-beads/src/pages/mobile/MakingPage.tsx`
- 将提示文案
  - `閫変腑区块 (...)`
  - 修复为：`选中区块 (...)`

## 验证结果

### 构建验证
- 命令：`npm run build`
- 结果：通过。

### MCP 页面回归
- `http://127.0.0.1:3005/mobile/home`
  - 引导弹层显示正常：`跳过`、`下一步`、`欢迎来到拼豆工坊`。
- `http://127.0.0.1:3005/mobile/help`
  - 页面标题与教程、FAQ 文案正常，MARD 文案正确。

### 端口与进程说明
- 本轮 MCP 临时启动了一个 `127.0.0.1:3005` 的 Vite 进程用于测试；
- 测试结束后已 `taskkill` 结束本轮启动的进程；
- 当前 3005 仍有你之前已存在的另一个 Vite 进程在监听（`--host 0.0.0.0`），未动它。

## 结论
- 本轮已完成：
  - 色系文案一致性修复；
  - 源码乱码清理；
  - 1 处用户可见乱码修复；
  - 构建与 MCP 回归通过。
