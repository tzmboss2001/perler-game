# 编辑页调节区横向重排 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把编辑页的预览缩放与宽度调节改成响应式左右布局，让主按钮更靠近首屏。

**Architecture:** 只改 `EditorPage.tsx` 的布局与样式分支，不动生成逻辑。通过视口阈值切换横向两列与纵向堆叠，并用 MCP 验证首屏可见性。

**Tech Stack:** React、TypeScript、内联样式、Vite、MCP

---

### Task 1: 调节区布局与样式

**Files:**
- Modify: `perler-beads/src/pages/mobile/EditorPage.tsx`
- Test: `npm run build`

- [ ] 调整编辑页调节区为 `>390px` 两列布局，保留 `<=390px` 纵向回退。
- [ ] 收紧滑杆、按钮与快捷项宽度，避免右侧宽度区溢出。
- [ ] 把主按钮位置随调节区高度回收上移。

### Task 2: 验证与记录

**Files:**
- Create: `MD/client/2026-04-27_editor_controls_horizontal_layout.md`

- [ ] 运行 `npm run build`
- [ ] 启动本地 dev 服务并用 MCP 验证移动口径下主按钮更靠前
- [ ] 记录修改与验证结果
