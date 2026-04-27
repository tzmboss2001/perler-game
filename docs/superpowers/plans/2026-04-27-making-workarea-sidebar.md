# 桌面单板制作工作区侧边栏优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让桌面宽屏单板模式把更多次级操作收进右侧侧边栏，回收主区高度给图纸工作区。

**Architecture:** 在 `singleBoardInteraction.js` 增加一个小型布局 helper，集中描述桌面侧边栏压缩模式下哪些主区控件应该隐藏、哪些侧边栏控件应该出现。`MakingPage.tsx` 只消费这个 helper，避免把布局分支继续散在 JSX 里。主区移除桌面单板工作流卡片，侧边栏总览区补齐工作流操作。

**Tech Stack:** React、TypeScript/TSX、Node test、Vite

---

### Task 1: 补布局 helper 和 failing test

**Files:**
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`
- Modify: `TEST/single_board_interaction.test.mjs`

- [ ] **Step 1: 写 failing test**

在 `TEST/single_board_interaction.test.mjs` 增加测试，验证桌面侧边栏单板模式下，主区工作流卡片和主工具条换色入口都会被关闭，而侧边栏工作流入口会被打开。

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: 新增测试因 `getMakingDesktopSingleBoardUiFlags` 未定义而失败。

- [ ] **Step 3: 实现最小 helper**

在 `perler-beads/src/utils/singleBoardInteraction.js` 新增 `getMakingDesktopSingleBoardUiFlags()`，输入 `viewMode / useDesktopSidebarLayout / hasSelectedColor`，输出：
- `isDesktopSidebarSingleBoard`
- `showMainWorkflowCard`
- `showToolbarReplaceAction`
- `showSidebarWorkflowActions`

- [ ] **Step 4: 再跑测试确认转绿**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: 新增 helper 测试通过。

### Task 2: 主区收薄并把工作流动作并到侧边栏

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: 接入 helper**

在 `MakingPage.tsx` 中读取 `getMakingDesktopSingleBoardUiFlags()`，统一判断桌面侧边栏单板模式。

- [ ] **Step 2: 去掉主区重复工作流卡片**

让桌面侧边栏单板模式下不再渲染主区那块 `singleBoardDesktopWorkflowCard`。

- [ ] **Step 3: 在侧边栏总览区补齐工作流动作**

把以下动作并入右侧总览区：
- `标记本板完成 / 取消完成`
- `继续板X`
- `展开总览 / 收起总览`

- [ ] **Step 4: 隐藏桌面主工具条里的重复换色按钮**

桌面侧边栏单板模式下，主工具条不再显示 `换色`，只保留侧边栏入口。

- [ ] **Step 5: 调整样式**

为侧边栏新增紧凑动作行样式，保持操作可点击，同时不把侧边栏撑得过重。

### Task 3: 验证、记录和回归

**Files:**
- Create: `MD/client/2026-04-27_making_workarea_sidebar_optimize.md`

- [ ] **Step 1: 跑自动化测试**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: 全部通过。

- [ ] **Step 2: 跑构建**

Run: `cmd /c npm.cmd run build`

Expected: build 成功。

- [ ] **Step 3: MCP 回归**

桌面口径验证：
- 侧边栏存在工作流动作
- 主区单板工作流卡片消失
- 画布可见高度增加

手机口径验证：
- 不出现桌面侧边栏
- 单板模式主流程不变

- [ ] **Step 4: 补 MD 记录**

在 `MD/client/2026-04-27_making_workarea_sidebar_optimize.md` 记录修改范围、测试结果、MCP 观察结果。
