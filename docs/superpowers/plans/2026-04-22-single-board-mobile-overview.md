# Single Board Mobile Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile single-board overview always reachable, center-adaptive, and draggable by header without harming board-jump behavior.

**Architecture:** Add small pure helpers in `singleBoardInteraction.js` for overview visibility and drag/layout clamping, then wire them into `MakingPage.tsx` state and styles. Keep the existing overview canvas draw path and only change entry visibility plus overlay container behavior.

**Tech Stack:** React, TypeScript/TSX, existing mobile making page state, Node test runner

---

### Task 1: Add failing tests for mobile overview behavior

**Files:**
- Modify: `TEST/single_board_interaction.test.mjs`
- Test: `TEST/single_board_interaction.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- single-board mobile overview button visibility for one-board and multi-board cases
- centered mobile overview layout with viewport bounds
- header-drag clamping staying inside viewport

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test TEST\\single_board_interaction.test.mjs`
Expected: FAIL because the new helper functions do not exist yet.

- [ ] **Step 3: Write minimal helper implementations**

Files:
- `perler-beads/src/utils/singleBoardInteraction.js`

Add pure helpers for:
- `shouldShowSingleBoardMobileOverviewButton`
- `getSingleBoardMobileOverviewLayout`
- `clampSingleBoardMobileOverviewOffset`

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test TEST\\single_board_interaction.test.mjs`
Expected: PASS for the new tests.

### Task 2: Wire the new overview behavior into MakingPage

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: Add local state for mobile overview drag offset**

- [ ] **Step 2: Replace button visibility logic**

Show the mobile overview button whenever single-board mobile mode has an active board, instead of only when `totalBoardCount > 1`.

- [ ] **Step 3: Replace the fixed-bottom overlay layout**

Use the new layout helper to render a centered adaptive card with bounded width and height.

- [ ] **Step 4: Add header-only drag handlers**

Only the overview header starts drag. Keep canvas click behavior unchanged.

- [ ] **Step 5: Keep arrows conditional**

Only show left/right board arrows when `totalBoardCount > 1`.

### Task 3: Verify and document

**Files:**
- Modify: `MD/client/2026-04-22_single_board_mobile_overview_centered_and_draggable.md`

- [ ] **Step 1: Run automated regression**

Run: `node --test TEST\\single_board_interaction.test.mjs`
Expected: PASS

- [ ] **Step 2: Run build**

Run: `npm.cmd run build`
Expected: PASS

- [ ] **Step 3: Run MCP mobile-page verification**

Verify:
- one-board case shows overview button
- multi-board overview opens centered
- header drag moves the card
- overview canvas remains clickable

- [ ] **Step 4: Write MD change record**

Summarize root cause, UI changes, tests, and MCP result.
