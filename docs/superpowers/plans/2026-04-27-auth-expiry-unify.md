# 登录过期统一收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 统一前端对登录过期的识别、清 token 和 UI 登录态同步，避免各页面分散处理。

**Architecture:** 新增一个 `authExpiry` 工具层，供各 API request helper 复用；`clearToken()` 负责广播登录状态清空事件；`App.tsx` 统一监听该事件并重新执行 `initUser()`，让 Zustand 登录态和本地存储保持一致。

**Tech Stack:** React、Zustand、TypeScript、Vite、Node test

---

### Task 1: 写登录过期识别的失败测试

**Files:**
- Create: `TEST/auth_expiry_unify.test.mjs`
- Test: `TEST/auth_expiry_unify.test.mjs`

- [ ] **Step 1: 写失败测试，覆盖 401 / 7 / 未登录文案识别**
- [ ] **Step 2: 运行 `cmd /c node --test TEST\\auth_expiry_unify.test.mjs`，确认红灯**

### Task 2: 实现统一鉴权失效工具

**Files:**
- Create: `perler-beads/src/services/api/authExpiry.ts`
- Modify: `perler-beads/src/services/api/authApi.ts`

- [ ] **Step 1: 在 `authExpiry.ts` 实现统一判断函数**
- [ ] **Step 2: 在 `authApi.clearToken()` 增加登录态清空事件广播**
- [ ] **Step 3: 运行 `cmd /c node --test TEST\\auth_expiry_unify.test.mjs`，确认转绿**

### Task 3: 接入主要 API request helper

**Files:**
- Modify: `perler-beads/src/services/api/authApi.ts`
- Modify: `perler-beads/src/services/api/projectApi.ts`
- Modify: `perler-beads/src/services/api/communityApi.ts`
- Modify: `perler-beads/src/services/api/finishedWorkApi.ts`
- Modify: `perler-beads/src/services/api/templateApi.ts`
- Modify: `perler-beads/src/services/api/userApi.ts`
- Modify: `perler-beads/src/services/api/uploadApi.ts`

- [ ] **Step 1: 各 request helper 在 `response.json()` 后统一调用 `handleAuthExpiredApiResponse`**
- [ ] **Step 2: 保持原有返回值结构，不强制所有调用方改造**
- [ ] **Step 3: 重新跑 `cmd /c node --test TEST\\auth_expiry_unify.test.mjs`**

### Task 4: 同步 Zustand 登录态

**Files:**
- Modify: `perler-beads/src/store/userStore.ts`
- Modify: `perler-beads/src/App.tsx`

- [ ] **Step 1: 让 `initUser()` 在无 token 时显式回到未登录**
- [ ] **Step 2: `App.tsx` 全局监听 `perler-auth-cleared` 并调用 `initUser()`**
- [ ] **Step 3: 补一条测试覆盖“token 被清后回到未登录”**

### Task 5: 页面收口和验证

**Files:**
- Modify: `perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- Modify: `perler-beads/src/pages/mobile/FinishedWorkDetailPage.tsx`
- Modify: `MD/client/2026-04-27_auth_expiry_unify.md`

- [ ] **Step 1: 社区详情/成品详情改为复用统一 helper，删掉本地重复判断**
- [ ] **Step 2: 运行 `cmd /c npm.cmd run build`**
- [ ] **Step 3: 启本地 dev 服务并用 MCP 验证登录态清空后 UI 会切回未登录**
- [ ] **Step 4: 记录修改到 `MD/client/2026-04-27_auth_expiry_unify.md`**
