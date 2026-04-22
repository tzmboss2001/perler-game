# Single-Board Mobile Overview Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proportional resize handle to the mobile single-board overview card so users can resize the overview locally without breaking drag, jump, or board-sync behavior.

**Architecture:** Extend the existing mobile overview layout helper layer to own width bounds, resize clamping, and persisted size calculation. Then wire `MakingPage.tsx` to split drag-vs-resize pointer flows, persist the chosen size in local storage, and keep the overview canvas redraw path unchanged except for updated layout input.

**Tech Stack:** React, TypeScript, node:test, localStorage, existing inline style system.

---

### Task 1: Add resize helper coverage first

**Files:**
- Modify: `TEST/single_board_interaction.test.mjs`
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`

- [ ] **Step 1: Write the failing tests**

Add these tests near the existing mobile overview helper tests:

```javascript
test("mobile overview resize layout widens within viewport bounds", () => {
  assert.deepEqual(
    getSingleBoardMobileOverviewLayout({
      viewportWidth: 390,
      viewportHeight: 844,
      offsetX: 0,
      offsetY: 0,
      widthOverride: 260,
    }),
    {
      width: 260,
      maxHeight: 330,
      left: 65,
      top: 257,
      minLeft: 16,
      maxLeft: 114,
      minTop: 108,
      maxTop: 406,
      minWidth: 176,
      maxWidth: 280,
    },
  );
});

test("mobile overview width is clamped into legal bounds", () => {
  assert.equal(
    clampSingleBoardMobileOverviewWidth({
      requestedWidth: 120,
      minWidth: 176,
      maxWidth: 280,
    }),
    176,
  );
  assert.equal(
    clampSingleBoardMobileOverviewWidth({
      requestedWidth: 420,
      minWidth: 176,
      maxWidth: 280,
    }),
    280,
  );
});

test("mobile overview resize keeps the card inside viewport bounds", () => {
  assert.deepEqual(
    clampSingleBoardMobileOverviewOffset({
      nextOffsetX: 200,
      nextOffsetY: 240,
      baseLeft: 65,
      baseTop: 257,
      minLeft: 16,
      maxLeft: 114,
      minTop: 108,
      maxTop: 406,
    }),
    {
      offsetX: 49,
      offsetY: 149,
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test TEST\single_board_interaction.test.mjs
```

Expected: FAIL because `clampSingleBoardMobileOverviewWidth` does not exist yet and the layout return shape does not include width-bound fields.

- [ ] **Step 3: Write minimal helper implementation**

In `perler-beads/src/utils/singleBoardInteraction.js`, update the overview helper block so it supports width override and width clamping:

```javascript
export function clampSingleBoardMobileOverviewWidth({
  requestedWidth,
  minWidth,
  maxWidth,
}) {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(requestedWidth)));
}

export function getSingleBoardMobileOverviewLayout({
  viewportWidth,
  viewportHeight,
  offsetX = 0,
  offsetY = 0,
  widthOverride,
}) {
  const sideMargin = 16;
  const topReserved = 108;
  const bottomReserved = 108;
  const minWidth = 176;
  const maxWidth = Math.max(
    minWidth,
    Math.min(280, Math.round(viewportWidth - 24 * 2)),
  );
  const width = clampSingleBoardMobileOverviewWidth({
    requestedWidth: widthOverride ?? 220,
    minWidth,
    maxWidth,
  });
  const aspectRatio = 220 / 280;
  const maxHeight = Math.max(
    180,
    Math.min(
      Math.round(width / aspectRatio),
      Math.round(viewportHeight - topReserved - bottomReserved),
    ),
  );
  // keep existing left/top/min/max calculations
  return {
    width,
    maxHeight,
    left,
    top,
    minLeft,
    maxLeft,
    minTop,
    maxTop,
    minWidth,
    maxWidth,
  };
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
git commit -m "test: cover mobile overview resize helpers"
```

### Task 2: Wire resize state and pointer flow into MakingPage

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`

- [ ] **Step 1: Write the failing test**

Extend the helper test file with persistence-safe layout tests that describe the target UI state:

```javascript
test("mobile overview title and layout support persisted custom width", () => {
  const layout = getSingleBoardMobileOverviewLayout({
    viewportWidth: 390,
    viewportHeight: 844,
    widthOverride: 248,
  });

  assert.equal(layout.width, 248);
  assert.equal(layout.maxWidth, 280);
  assert.equal(layout.minWidth, 176);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test TEST\single_board_interaction.test.mjs
```

Expected: FAIL until `getSingleBoardMobileOverviewLayout` exposes the new width-bound fields and accepts override consistently.

- [ ] **Step 3: Write minimal implementation**

Update `MakingPage.tsx` with the following focused changes:

```tsx
const SINGLE_BOARD_MOBILE_OVERVIEW_WIDTH_KEY =
  "perler.singleBoardMobileOverviewWidth";

const [singleBoardMobileOverviewWidth, setSingleBoardMobileOverviewWidth] =
  useState(220);

const singleBoardMobileOverviewResizeRef = useRef({
  resizing: false,
  startClientX: 0,
  startWidth: 220,
});
```

Use the width in layout calculation:

```tsx
const singleBoardMobileOverviewLayout = useMemo(() => {
  if (!isSingleBoardMobile || !singleBoardMobileMiniMapExpanded) return null;
  return getSingleBoardMobileOverviewLayout({
    viewportWidth,
    viewportHeight,
    offsetX: singleBoardMobileOverviewOffset.x,
    offsetY: singleBoardMobileOverviewOffset.y,
    widthOverride: singleBoardMobileOverviewWidth,
  });
}, [
  isSingleBoardMobile,
  singleBoardMobileMiniMapExpanded,
  viewportWidth,
  viewportHeight,
  singleBoardMobileOverviewOffset.x,
  singleBoardMobileOverviewOffset.y,
  singleBoardMobileOverviewWidth,
]);
```

Load/save width locally:

```tsx
useEffect(() => {
  if (!isSingleBoardMobile) return;
  try {
    const raw = localStorage.getItem(
      SINGLE_BOARD_MOBILE_OVERVIEW_WIDTH_KEY,
    );
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      setSingleBoardMobileOverviewWidth(parsed);
    }
  } catch {}
}, [isSingleBoardMobile]);

useEffect(() => {
  if (!isSingleBoardMobile) return;
  try {
    localStorage.setItem(
      SINGLE_BOARD_MOBILE_OVERVIEW_WIDTH_KEY,
      String(singleBoardMobileOverviewWidth),
    );
  } catch {}
}, [isSingleBoardMobile, singleBoardMobileOverviewWidth]);
```

Add a resize handle and pointer flow split:

```tsx
const handleSingleBoardMobileOverviewResizeStart = useCallback(
  (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!singleBoardMobileOverviewLayout) return;
    singleBoardMobileOverviewResizeRef.current = {
      resizing: true,
      startClientX: event.clientX,
      startWidth: singleBoardMobileOverviewLayout.width,
    };
  },
  [singleBoardMobileOverviewLayout],
);
```

In the shared pointer move effect:

```tsx
if (resizeState.resizing && singleBoardMobileOverviewLayout) {
  const nextWidth = clampSingleBoardMobileOverviewWidth({
    requestedWidth:
      resizeState.startWidth + (event.clientX - resizeState.startClientX),
    minWidth: singleBoardMobileOverviewLayout.minWidth,
    maxWidth: singleBoardMobileOverviewLayout.maxWidth,
  });
  setSingleBoardMobileOverviewWidth(nextWidth);
  return;
}
```

And render:

```tsx
<div
  style={styles.singleBoardMobileOverviewResizeHandle}
  onPointerDown={handleSingleBoardMobileOverviewResizeStart}
  aria-label="缩放总览"
  role="button"
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
node --test TEST\single_board_interaction.test.mjs
```

Expected: PASS with the new width-aware layout behavior.

- [ ] **Step 5: Commit**

```powershell
git add perler-beads/src/pages/mobile/MakingPage.tsx perler-beads/src/utils/singleBoardInteraction.js TEST/single_board_interaction.test.mjs
git commit -m "feat: add mobile overview resize handle"
```

### Task 3: Finish visual polish, docs, and verification

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Create: `MD/client/2026-04-22_single_board_mobile_overview_resize_handle.md`

- [ ] **Step 1: Write the failing acceptance check**

Use MCP/manual acceptance as the failing check:

```text
Expected before fix:
- No resize handle in the card corner
- Overview width cannot be changed
- Refresh loses any attempted size preference
```

- [ ] **Step 2: Run the failing acceptance check**

Run:

```powershell
npm.cmd run build
```

Then use MCP on `http://127.0.0.1:3005/mobile/making` and confirm the resize handle is absent before the implementation is complete.

- [ ] **Step 3: Write minimal implementation**

Add final visual polish:

```tsx
singleBoardMobileOverviewResizeHandle: {
  position: "absolute",
  right: 10,
  bottom: 10,
  width: 26,
  height: 26,
  borderRadius: 999,
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(255,255,255,0.92)",
  boxShadow: "0 8px 20px rgba(31,41,55,0.18)",
  cursor: "nwse-resize",
  zIndex: 3,
},
```

And write the MD record with summary, verification commands, and MCP findings.

- [ ] **Step 4: Run verification to confirm it passes**

Run:

```powershell
node --test TEST\single_board_interaction.test.mjs
npm.cmd run build
```

Then MCP-verify:

- mobile viewport can open `总览`
- dragging card still works
- dragging resize handle changes width proportionally
- clicking overview board still jumps
- refresh keeps the adjusted width

- [ ] **Step 5: Commit**

```powershell
git add perler-beads/src/pages/mobile/MakingPage.tsx TEST/single_board_interaction.test.mjs MD/client/2026-04-22_single_board_mobile_overview_resize_handle.md
git commit -m "feat: polish mobile overview resize interaction"
```
