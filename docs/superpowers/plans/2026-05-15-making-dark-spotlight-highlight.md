# Making Dark Spotlight Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current light same-color tint with a dark spotlight highlight in making mode.

**Architecture:** Add a pure visual-style helper in `singleBoardInteraction.js`, test it from the existing node test suite, then consume it from `MakingPage.tsx` base and overlay canvas drawing. Keep export code untouched.

**Tech Stack:** React, TypeScript, Canvas 2D, Node test runner, Vite.

---

### Task 1: Lock Visual Contract

**Files:**
- Modify: `TEST/single_board_interaction.test.mjs`
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`

- [ ] Add import for `getColorSpotlightVisualStyle`.
- [ ] Add a failing test that asserts:
  - outside-scope dim is stronger than inside-scope dim,
  - target lift is light and not a color-changing pink wash,
  - selected-cell stroke is stronger than normal target stroke.
- [ ] Run `cmd /c node --test TEST\single_board_interaction.test.mjs` and confirm the new test fails because the helper is missing.
- [ ] Implement `getColorSpotlightVisualStyle({ dpr })`.
- [ ] Re-run the same test and confirm it passes.

### Task 2: Connect Canvas Rendering

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] Import `getColorSpotlightVisualStyle`.
- [ ] In the base canvas color-selection branch, replace current light dim/tint constants with the helper:
  - outside scope uses `outsideScopeDim`,
  - current-board non-target cells use `insideScopeDim`,
  - target cells use `targetLift`.
- [ ] In the focus-board overlay branch, keep block mode unchanged and use dark dim only for color mode.
- [ ] In the overlay canvas color-selection branch, use helper stroke widths and colors:
  - normal target cells get a crisp light outline,
  - selected cell gets the stronger double outline.

### Task 3: Verify

**Files:**
- Modify: `MD/client/2026-05-15_making_dark_spotlight_highlight.md`

- [ ] Run `cmd /c node --test TEST\single_board_interaction.test.mjs`.
- [ ] Run `cmd /c node --test TEST\export_modal_visual_contract.test.mjs`.
- [ ] Run `cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_clean --emptyOutDir` from `perler-beads`.
- [ ] Open making mode in Chrome and capture a screenshot for visual review.
- [ ] Write the MD record with files changed, commands run, residual risks, and rollback path.
