# Making Desktop Single-Board Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the desktop single-board making layout so the canvas workspace regains vertical space without changing mobile behavior.

**Architecture:** Add small helper logic for desktop-vs-mobile single-board mode and canvas min-height, then update `MakingPage.tsx` to use a denser desktop-only top bar, compact overview dock, and thinner bottom controls. Keep all changes behind the desktop single-board branch so mobile UI remains unchanged.

**Tech Stack:** React, TypeScript, node:test, existing inline style system, MCP browser validation.

---

### Task 1: Add layout mode helpers and tests first

**Files:**
- Modify: `TEST/single_board_interaction.test.mjs`
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`

- [ ] **Step 1: Write the failing tests**

Add these tests:

```javascript
test("single-board layout flags distinguish desktop from mobile", () => {
  assert.deepEqual(
    getSingleBoardLayoutFlags({
      viewMode: "singleBoard",
      viewportWidth: 1540,
    }),
    {
      isSingleBoardMobile: false,
      isSingleBoardDesktop: true,
    },
  );
  assert.deepEqual(
    getSingleBoardLayoutFlags({
      viewMode: "singleBoard",
      viewportWidth: 390,
    }),
    {
      isSingleBoardMobile: true,
      isSingleBoardDesktop: false,
    },
  );
});

test("desktop single-board mode gets a taller canvas min height", () => {
  assert.equal(
    getSingleBoardCanvasMinHeight({
      viewMode: "singleBoard",
      isSingleBoardMobile: false,
      isSingleBoardDesktop: true,
      singleBoardAllDone: false,
    }),
    "clamp(560px, 80vh, 980px)",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test TEST\single_board_interaction.test.mjs
```

Expected: FAIL because the new helper exports do not exist yet.

- [ ] **Step 3: Write minimal implementation**

In `perler-beads/src/utils/singleBoardInteraction.js` add:

```javascript
export function getSingleBoardLayoutFlags({ viewMode, viewportWidth }) {
  const isSingleBoardMobile =
    viewMode === "singleBoard" && viewportWidth <= 640;
  return {
    isSingleBoardMobile,
    isSingleBoardDesktop:
      viewMode === "singleBoard" && viewportWidth > 640,
  };
}

export function getSingleBoardCanvasMinHeight({
  viewMode,
  isSingleBoardMobile,
  isSingleBoardDesktop,
  singleBoardAllDone,
}) {
  if (viewMode !== "singleBoard") return undefined;
  if (isSingleBoardDesktop) {
    return singleBoardAllDone
      ? "clamp(460px, 72vh, 860px)"
      : "clamp(560px, 80vh, 980px)";
  }
  return isSingleBoardMobile && !singleBoardAllDone
    ? "clamp(500px, 76vh, 920px)"
    : "clamp(420px, 68vh, 760px)";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
node --test TEST\single_board_interaction.test.mjs
```

Expected: PASS for the new helper tests.

- [ ] **Step 5: Commit**

```powershell
git add TEST/single_board_interaction.test.mjs perler-beads/src/utils/singleBoardInteraction.js
git commit -m "test: cover desktop single-board layout helpers"
```

### Task 2: Apply desktop-only dense layout in MakingPage

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: Write the failing acceptance target**

Use the existing MCP desktop capture as the failing baseline:

```text
Desktop making page currently stacks:
- resume card
- summary header
- quick row
- workflow card
- minimap card
- board chip row
before the canvas area, leaving the canvas viewport visibly shallow.
```

- [ ] **Step 2: Run the failing acceptance check**

Open the desktop making page and capture measurements before the fix:

```powershell
# Use MCP on https://app-pd.shop888.vip/mobile/making at desktop width ~1540
```

Expected: canvas visible region remains shallow and top chrome remains tall.

- [ ] **Step 3: Write minimal implementation**

In `MakingPage.tsx`:

1. Import and derive flags:

```tsx
const { isSingleBoardMobile, isSingleBoardDesktop } = useMemo(
  () =>
    getSingleBoardLayoutFlags({
      viewMode,
      viewportWidth,
    }),
  [viewMode, viewportWidth],
);
```

2. Use helper-driven canvas min height:

```tsx
const canvasContainerStyle: React.CSSProperties = {
  ...styles.canvasContainer,
  minHeight: getSingleBoardCanvasMinHeight({
    viewMode,
    isSingleBoardMobile,
    isSingleBoardDesktop,
    singleBoardAllDone,
  }),
};
```

3. For desktop single-board mode:
- hide the thick progress track
- compress the resume entry with smaller padding/font
- replace the large `singleBoardHeroRow` with a denser desktop row
- make the minimap card smaller
- reduce chip/button heights
- tighten the bottom task/control bar fonts and spacing

Use inline style overrides or new styles such as:

```tsx
singleBoardDesktopDenseRow
singleBoardDesktopWorkflowCompact
singleBoardDesktopMiniMapCompact
singleBoardDesktopActionRow
singleBoardDesktopTaskBar
```

The desktop row should combine:
- current-board meta
- mark complete / reset actions
- compact minimap dock

- [ ] **Step 4: Run test/build to verify it still passes**

Run:

```powershell
node --test TEST\single_board_interaction.test.mjs
cd perler-beads
npm.cmd run build
```

Expected: all tests pass and build succeeds.

- [ ] **Step 5: Commit**

```powershell
git add perler-beads/src/pages/mobile/MakingPage.tsx perler-beads/src/utils/singleBoardInteraction.js TEST/single_board_interaction.test.mjs
git commit -m "feat: compress desktop single-board layout"
```

### Task 3: Verify with MCP and document the fix

**Files:**
- Create: `MD/client/2026-04-23_making_desktop_single_board_layout_compact_fix.md`

- [ ] **Step 1: Write the acceptance checklist**

```text
Desktop acceptance:
- canvas visible region is noticeably taller
- top info no longer appears as multiple tall stacked cards
- minimap still works
- bottom task controls still readable

Mobile acceptance:
- single-board mobile overview and controls remain unchanged
```

- [ ] **Step 2: Run MCP verification**

Use MCP to validate:

- desktop width about `1540`
- capture before/after canvas visible height if possible
- verify minimap, board navigation, zoom controls
- switch to mobile width and verify no regression

- [ ] **Step 3: Write the MD record**

Document:
- root cause
- files changed
- commands run
- MCP findings

- [ ] **Step 4: Run final verification**

Run:

```powershell
node --test TEST\single_board_interaction.test.mjs
cd perler-beads
npm.cmd run build
```

Expected: clean pass before claiming completion.

- [ ] **Step 5: Commit**

```powershell
git add MD/client/2026-04-23_making_desktop_single_board_layout_compact_fix.md
git commit -m "docs: record desktop single-board layout fix"
```
