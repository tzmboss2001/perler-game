# Physical Board Ten-Cell Cross Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw subtle dashed counting crosses inside every complete 10x10 physical-board block on the making canvas and exported making charts.

**Architecture:** Add a pure geometry helper to `boardService.ts`, then share it between the live overlay canvas in `MakingPage.tsx` and PNG export renderers in `colorMatchService.ts`. Keep overview export unchanged.

**Tech Stack:** React 19, Vite 6, TypeScript, HTML canvas, Node test runner.

---

### Task 1: Physical Board Geometry Helper

**Files:**
- Modify: `perler-beads/src/services/boardService.ts`
- Create: `TEST/physical_board_guides.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("../perler-beads/node_modules/typescript");

function loadBoardService() {
  const source = fs.readFileSync("perler-beads/src/services/boardService.ts", "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const sandbox = { exports: {} };
  vm.runInNewContext(output, sandbox);
  return sandbox.exports;
}

test("ten-cell cross guides are returned only for complete 10x10 physical blocks", () => {
  const { getPhysicalBoardTenCellCrossGuides } = loadBoardService();
  const guides = getPhysicalBoardTenCellCrossGuides(54);

  assert.equal(guides.length, 25);
  assert.deepEqual(guides[0], {
    startX: 2,
    startY: 2,
    endX: 12,
    endY: 12,
    centerX: 7,
    centerY: 7,
  });
  assert.deepEqual(guides.at(-1), {
    startX: 42,
    startY: 42,
    endX: 52,
    endY: 52,
    centerX: 47,
    centerY: 47,
  });
  assert.equal(guides.some((guide) => guide.startX === 0 || guide.startY === 0), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c node --test TEST\physical_board_guides.test.mjs`

Expected: FAIL because `getPhysicalBoardTenCellCrossGuides` is not exported.

- [ ] **Step 3: Add the minimal helper**

Add `PhysicalBoardTenCellCrossGuide` and `getPhysicalBoardTenCellCrossGuides(boardSize)` to `boardService.ts`. Build local segment ranges from `getPhysicalBoardSegments(boardSize)`, keep only segment ranges with `size === 10`, and return every X/Y pair with `centerX = startX + 5` and `centerY = startY + 5`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cmd /c node --test TEST\physical_board_guides.test.mjs`

Expected: PASS.

### Task 2: Canvas Consumers

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `perler-beads/src/services/colorMatchService.ts`
- Create: `TEST/physical_board_guides_visual_contract.test.mjs`

- [ ] **Step 1: Write the visual contract test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("making overlay and export renderers draw dashed ten-cell cross guides from shared geometry", () => {
  const makingSource = fs.readFileSync("perler-beads/src/pages/mobile/MakingPage.tsx", "utf8");
  const exportSource = fs.readFileSync("perler-beads/src/services/colorMatchService.ts", "utf8");

  assert.match(makingSource, /getPhysicalBoardTenCellCrossGuides/);
  assert.match(makingSource, /tenCellCrossGuides/);
  assert.match(makingSource, /setLineDash\(\[Math\.max\(2, drawCellSize \* 0\.28\), Math\.max\(2, drawCellSize \* 0\.22\)\]\)/);

  assert.match(exportSource, /getPhysicalBoardTenCellCrossGuides/);
  assert.match(exportSource, /drawTenCellCrossGuides/);
  assert.match(exportSource, /ctx\.setLineDash\(\[Math\.max\(2, cellSize \* 0\.25\), Math\.max\(2, cellSize \* 0\.2\)\]\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c node --test TEST\physical_board_guides_visual_contract.test.mjs`

Expected: FAIL because consumers do not use the helper yet.

- [ ] **Step 3: Update live overlay**

Import `getPhysicalBoardTenCellCrossGuides` in `MakingPage.tsx`. In the overlay draw effect, create `tenCellCrossGuides` and, when `drawCellSize >= 10`, draw each visible block as a weak dashed vertical and horizontal line clipped to the block rectangle.

- [ ] **Step 4: Update export renderers**

Import `getPhysicalBoardTenCellCrossGuides` in `colorMatchService.ts`. Add a small internal `drawTenCellCrossGuides()` helper and call it inside the `showMajorGrid` branch for normal canvas exports, list exports, and paginated board page exports. Do not call it from overview export.

- [ ] **Step 5: Run tests**

Run:

```powershell
cmd /c node --test TEST\physical_board_guides.test.mjs
cmd /c node --test TEST\physical_board_guides_visual_contract.test.mjs
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\export_modal_visual_contract.test.mjs
```

Expected: all pass.

### Task 3: Build, Visual Check, and Record

**Files:**
- Create: `MD/client/2026-05-15_physical_board_ten_cell_cross_guides.md`

- [ ] **Step 1: Build**

Run from `perler-beads`:

```powershell
cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_clean --emptyOutDir
```

Expected: exit code 0. Vite chunk-size warnings are acceptable if no error occurs.

- [ ] **Step 2: Visual check**

Use the running dev server without killing node. Open the making page and capture a screenshot at readable zoom. Confirm the new cross guides are subtle, dashed, and weaker than board boundaries and highlight outlines.

- [ ] **Step 3: Record client change**

Create `MD/client/2026-05-15_physical_board_ten_cell_cross_guides.md` with changed files, behavior, verification commands, residual risks, and rollback notes.
