# Mobile Single-Board UI Compact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 压缩手机端单板模式首屏控件，把次级工具收进统一入口，让图纸工作区拿回更多高度。

**Architecture:** 在 `singleBoardInteraction.js` 增加一个小型 helper，统一描述手机端单板模式下哪些按钮属于核心常驻、哪些按钮应该进工具面板。`MakingPage.tsx` 只消费这个 helper，避免直接在 JSX 里散落大量手机特判。现有 `showSettings` 面板复用为 `工具` 入口承载容器，减少新增状态和回归面。

**Tech Stack:** React、TypeScript/TSX、Node test、Vite、Chrome DevTools MCP

---

### Task 1: 用 TDD 锁定手机端单板模式按钮分层

**Files:**
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`
- Modify: `TEST/single_board_interaction.test.mjs`

- [ ] **Step 1: 写 failing test**

在 `TEST/single_board_interaction.test.mjs` 增加新测试，验证手机端单板模式下：
- 主工具条应显示 `总览 / 复位 / 完成 / 工具`
- `图纸 / 辅助 / 自动切换` 应归入工具面板
- 仅在选中色时才允许在工具面板里显示 `换色`

- [ ] **Step 2: 跑测试确认失败**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: 因 `getSingleBoardMobileUiFlags` 未导出而失败。

- [ ] **Step 3: 实现最小 helper**

在 `perler-beads/src/utils/singleBoardInteraction.js` 新增 `getSingleBoardMobileUiFlags()`，输入：
- `viewMode`
- `isSingleBoardMobile`
- `hasSelectedColor`

输出：
- `showToolbarOverview`
- `showToolbarReset`
- `showToolbarPrimaryComplete`
- `showToolbarTools`
- `showToolbarExport`
- `showToolbarAssist`
- `showToolbarAutoAdvance`
- `showToolsReplaceAction`

- [ ] **Step 4: 再跑测试确认转绿**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: 新增测试通过。

### Task 2: 收薄手机端单板模式首屏工具区

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: 接入 helper**

在 `MakingPage.tsx` 里读取 `getSingleBoardMobileUiFlags()`，统一控制手机端单板模式工具区显隐。

- [ ] **Step 2: 主工具条只保留核心按钮**

手机端单板模式首屏只保留：
- `总览`
- `复位`
- `完成`
- `工具`

保持缩放条常驻，但整体继续压薄。

- [ ] **Step 3: 把次级工具收进工具面板**

把以下按钮从手机端单板模式首屏移走，改为只在 `工具` 面板中出现：
- `图纸`
- `辅助`
- `自动切换`
- `换色`（仅有选中色时显示）

- [ ] **Step 4: 收薄顶部状态区**

让顶部单板状态信息保留进度和当前板提示，但压缩上下边距，并把自动切换改成更轻的状态表达。

- [ ] **Step 5: 保持旧功能通路**

确认原有逻辑仍可达：
- `showSettings` 继续复用
- `handleOpenExport`
- `setShowReplaceModal`
- `setAutoAdvanceOnBoardDone`
- `setShowVisionAssist`

### Task 3: 验证、回归和记录

**Files:**
- Create: `MD/client/2026-04-27_mobile_single_board_ui_compact.md`

- [ ] **Step 1: 跑自动化测试**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: 全部通过。

- [ ] **Step 2: 跑构建**

Run: `cmd /c npm.cmd run build`

Expected: build 成功。

- [ ] **Step 3: MCP 回归**

手机口径验证：
- 首屏只保留 `总览 / 复位 / 完成 / 工具 / 缩放`
- `工具` 打开后能看到 `图纸 / 辅助 / 自动切换`
- 选中色时能在工具面板里看到 `换色`
- 图纸工作区高度较当前版本增加

桌面口径验证：
- 不影响桌面侧边栏逻辑

- [ ] **Step 4: 补 MD 记录**

在 `MD/client/2026-04-27_mobile_single_board_ui_compact.md` 记录改动、测试结果和 MCP 观察结果。
