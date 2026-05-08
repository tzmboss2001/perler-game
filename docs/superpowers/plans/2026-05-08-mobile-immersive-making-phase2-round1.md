# Mobile Immersive Making Phase2 Round1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mobile single-board immersive making visual hierarchy, edge status hints, and basic transitions without changing Phase1 layout, gesture, freeze, drag-boundary, or board-switching behavior.

**Architecture:** Keep all interaction logic intact. Add a scoped visual contract test, a small testable z-index token helper, and scoped CSS classes for visual polish and motion. Apply class names and style token changes only when `isSingleBoardMobileImmersive` is true.

**Tech Stack:** React 19, TypeScript TSX, Vite, inline React style objects, scoped CSS imported from `main.tsx`, Node built-in test runner.

---

## File Structure

- Create: `perler-beads/src/styles/mobile-immersive-making.css`
  - Scoped CSS for Phase2 Round1 visual polish and reduced-motion handling.
- Modify: `perler-beads/src/main.tsx`
  - Import the new scoped CSS file.
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`
  - Add a pure z-index token helper for mobile immersive overlay layers.
- Modify: `TEST/single_board_interaction.test.mjs`
  - Add ordering tests for mobile immersive overlay layer tokens.
- Create: `TEST/mobile_immersive_visual_contract.test.mjs`
  - Static contract tests that block layout-affecting CSS and require scoped motion/reduced-motion support.
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
  - Add scoped data/class hooks and apply layer z-index tokens.
  - Refine mobile immersive overlay, status hint, and transition visuals.
- Create: `MD/client/2026-05-08_mobile_immersive_phase2_round1.md`
  - Record the completed client-side change, verification commands, and rollback boundary.

## Task 1: Visual Contract Test And Scoped CSS Hook

**Files:**
- Create: `TEST/mobile_immersive_visual_contract.test.mjs`
- Create: `perler-beads/src/styles/mobile-immersive-making.css`
- Modify: `perler-beads/src/main.tsx`

- [ ] **Step 1: Write the failing visual contract test**

Create `TEST/mobile_immersive_visual_contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cssPath = new URL("../perler-beads/src/styles/mobile-immersive-making.css", import.meta.url);
const mainPath = new URL("../perler-beads/src/main.tsx", import.meta.url);
const makingPagePath = new URL("../perler-beads/src/pages/mobile/MakingPage.tsx", import.meta.url);

function read(path) {
  return readFileSync(path, "utf8");
}

test("mobile immersive CSS is imported once from app entry", () => {
  const mainSource = read(mainPath);
  assert.match(
    mainSource,
    /import\s+["']\.\/styles\/mobile-immersive-making\.css["'];/,
  );
});

test("mobile immersive visual CSS stays scoped to making page immersive mode", () => {
  const css = read(cssPath);
  assert.match(
    css,
    /\[data-making-page\]\[data-mobile-single-board-immersive="1"\]/,
  );
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("mobile immersive visual CSS does not introduce layout occupancy", () => {
  const css = read(cssPath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@media[\s\S]*?\{([\s\S]*?)\}\s*$/g, "$1");
  const bannedProperties = [
    "position",
    "display",
    "top",
    "right",
    "bottom",
    "left",
    "inset",
    "width",
    "height",
    "min-height",
    "max-height",
    "padding",
    "margin",
  ];

  for (const property of bannedProperties) {
    assert.doesNotMatch(
      css,
      new RegExp(`(^|[;{\\s])${property}\\s*:`, "m"),
      `${property} must stay in React inline layout styles, not Phase2 visual CSS`,
    );
  }
});

test("making page exposes mobile immersive data and class hooks", () => {
  const source = read(makingPagePath);
  assert.match(source, /data-mobile-single-board-immersive=/);
  assert.match(source, /mobile-immersive-floating-controls/);
  assert.match(source, /mobile-immersive-toolbar-shell/);
  assert.match(source, /mobile-immersive-status-hint/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

Expected: FAIL because the CSS file and class/data hooks do not exist yet.

- [ ] **Step 3: Add scoped CSS file**

Create `perler-beads/src/styles/mobile-immersive-making.css`:

```css
[data-making-page][data-mobile-single-board-immersive="1"] .mobile-immersive-layer {
  transition:
    opacity 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    filter 180ms ease;
}

[data-making-page][data-mobile-single-board-immersive="1"] .mobile-immersive-floating-controls {
  filter: drop-shadow(0 10px 20px rgba(62, 45, 82, 0.12));
}

[data-making-page][data-mobile-single-board-immersive="1"] .mobile-immersive-toolbar-shell {
  transform: translate3d(0, 0, 0);
}

[data-making-page][data-mobile-single-board-immersive="1"] .mobile-immersive-toolbar-expanded {
  opacity: 0.98;
  transform: translate3d(0, -2px, 0);
}

[data-making-page][data-mobile-single-board-immersive="1"] .mobile-immersive-toolbar-collapsed {
  opacity: 0.82;
}

[data-making-page][data-mobile-single-board-immersive="1"] .mobile-immersive-status-hint {
  transform: translate3d(0, 0, 0);
}

[data-making-page][data-mobile-single-board-immersive="1"] .mobile-immersive-overview-card {
  transform: translate3d(0, 0, 0);
}

@media (prefers-reduced-motion: reduce) {
  [data-making-page][data-mobile-single-board-immersive="1"] .mobile-immersive-layer {
    transition: opacity 60ms linear;
  }
}
```

- [ ] **Step 4: Import scoped CSS**

Modify `perler-beads/src/main.tsx` so the imports include:

```ts
import "./styles/range-slider.css";
import "./styles/mobile-immersive-making.css";
```

- [ ] **Step 5: Add temporary hook class placeholders in `MakingPage.tsx`**

This step will be completed by later tasks. Do not change behavior here yet.

- [ ] **Step 6: Commit Task 1 after later class hooks exist and tests pass**

The commit should include Task 1 together with Task 2 or Task 4 if class hooks are added there:

```powershell
git add TEST\mobile_immersive_visual_contract.test.mjs perler-beads\src\styles\mobile-immersive-making.css perler-beads\src\main.tsx perler-beads\src\pages\mobile\MakingPage.tsx
git commit -m "style: add mobile immersive visual contract"
```

## Task 2: Overlay Layer Tokens And Visual Hierarchy

**Files:**
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`
- Modify: `TEST/single_board_interaction.test.mjs`
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: Write the failing z-index ordering test**

Add this import in `TEST/single_board_interaction.test.mjs`:

```js
  getSingleBoardMobileImmersiveLayerZIndexes,
```

Add this test near the existing immersive layout tests:

```js
test("mobile single-board immersive overlay layers keep explicit ordering", () => {
  assert.deepEqual(getSingleBoardMobileImmersiveLayerZIndexes(), {
    passiveStatus: 31,
    controls: 32,
    summary: 33,
    toolbar: 36,
    panel: 60,
    modal: 2500,
  });

  const layers = getSingleBoardMobileImmersiveLayerZIndexes();
  assert.ok(layers.passiveStatus < layers.controls);
  assert.ok(layers.controls < layers.summary);
  assert.ok(layers.summary < layers.toolbar);
  assert.ok(layers.toolbar < layers.panel);
  assert.ok(layers.panel < layers.modal);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: FAIL because `getSingleBoardMobileImmersiveLayerZIndexes` is not exported.

- [ ] **Step 3: Add the pure layer token helper**

Add to `perler-beads/src/utils/singleBoardInteraction.js` near other mobile immersive helpers:

```js
export function getSingleBoardMobileImmersiveLayerZIndexes() {
  return {
    passiveStatus: 31,
    controls: 32,
    summary: 33,
    toolbar: 36,
    panel: 60,
    modal: 2500,
  };
}
```

- [ ] **Step 4: Use the helper in `MakingPage.tsx`**

Add the helper to the import list from `../../utils/singleBoardInteraction.js`:

```ts
  getSingleBoardMobileImmersiveLayerZIndexes,
```

Add this memo near `singleBoardMobileImmersiveControlLayout`:

```ts
  const singleBoardMobileImmersiveLayers =
    getSingleBoardMobileImmersiveLayerZIndexes();
```

Update these style merges only in the `isSingleBoardMobileImmersive` path:

```ts
  const floatingControlsStyle: React.CSSProperties = {
    ...styles.floatingControls,
    // existing fields stay unchanged
    ...(isSingleBoardMobileImmersive
      ? {
          bottom: `max(${singleBoardMobileImmersiveControlLayout.zoomBottomPx}px, calc(env(safe-area-inset-bottom, 0px) + ${singleBoardMobileImmersiveControlLayout.zoomBottomPx}px))`,
          zIndex: singleBoardMobileImmersiveLayers.controls,
        }
      : {}),
  };
```

```ts
  const singleBoardMobileSummaryRowStyle: React.CSSProperties = {
    ...styles.singleBoardMobileSummaryRow,
    ...(isSingleBoardMobileImmersive
      ? {
          ...styles.singleBoardMobileImmersiveSummaryPill,
          zIndex: singleBoardMobileImmersiveLayers.summary,
        }
      : {}),
  };
```

```ts
  const singleBoardMobileToolbarShellStyle: React.CSSProperties = {
    ...styles.singleBoardMobileToolbarShell,
    ...(isSingleBoardMobileImmersive
      ? {
          ...styles.singleBoardMobileImmersiveToolbarShell,
          bottom: `max(${singleBoardMobileImmersiveControlLayout.toolbarBottomPx}px, calc(env(safe-area-inset-bottom, 0px) + ${singleBoardMobileImmersiveControlLayout.toolbarBottomPx}px))`,
          zIndex: singleBoardMobileImmersiveLayers.toolbar,
        }
      : {}),
  };
```

```ts
  const singleBoardMobileSwipeStatusStyle: React.CSSProperties = {
    ...styles.singleBoardSwipeStatus,
    ...singleBoardSwipeUi.style,
    ...(isSingleBoardMobileImmersive
      ? {
          ...styles.singleBoardMobileImmersiveSwipeStatus,
          zIndex: singleBoardMobileImmersiveLayers.passiveStatus,
        }
      : {}),
  };
```

For overview card/overlay style, keep existing `position`, `left`, `top`, `width`, and drag logic unchanged, but set the overlay z-index from `panel`:

```tsx
<div
  style={{
    ...styles.singleBoardMobileOverviewOverlay,
    ...(isSingleBoardMobileImmersive
      ? { zIndex: singleBoardMobileImmersiveLayers.panel }
      : {}),
  }}
>
```

- [ ] **Step 5: Run the ordering test and existing interaction tests**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add perler-beads\src\utils\singleBoardInteraction.js TEST\single_board_interaction.test.mjs perler-beads\src\pages\mobile\MakingPage.tsx
git commit -m "style: define mobile immersive overlay hierarchy"
```

## Task 3: Status Hint Visual Polish

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `perler-beads/src/styles/mobile-immersive-making.css`
- Modify: `TEST/mobile_immersive_visual_contract.test.mjs`

- [ ] **Step 1: Add static assertions for status edge treatment**

Extend `TEST/mobile_immersive_visual_contract.test.mjs`:

```js
test("mobile immersive status hint stays edge scoped and non-interactive", () => {
  const source = read(makingPagePath);
  assert.match(source, /mobile-immersive-status-hint/);
  assert.match(source, /pointerEvents:\s*"none"/);
  assert.doesNotMatch(source, /mobile-immersive-status-hint[\s\S]{0,300}translateX\(-50%\)/);
});
```

- [ ] **Step 2: Run the visual contract test and verify it fails if hooks are absent**

Run:

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

Expected before implementation: FAIL if status class hooks are absent.

- [ ] **Step 3: Add mobile immersive class helper**

Inside `MakingPage.tsx`, near style constants before `return`, add:

```ts
  const mobileImmersiveClass = (name: string) =>
    isSingleBoardMobileImmersive
      ? `mobile-immersive-layer mobile-immersive-${name}`
      : undefined;
```

- [ ] **Step 4: Add scoped data hook to the root**

Change the page root:

```tsx
    <div
      style={{ ...styles.container, height: viewportHeight }}
      data-making-page
      data-mobile-single-board-immersive={
        isSingleBoardMobileImmersive ? "1" : undefined
      }
    >
```

- [ ] **Step 5: Apply status class and edge visual style**

Change the mobile swipe status element:

```tsx
                        <div
                          className={mobileImmersiveClass("status-hint")}
                          style={singleBoardMobileSwipeStatusStyle}
                        >
```

Refine `styles.singleBoardMobileImmersiveSwipeStatus` without changing layout occupancy:

```ts
  singleBoardMobileImmersiveSwipeStatus: {
    position: "absolute" as const,
    left: "8px",
    right: "8px",
    top: "42px",
    opacity: 0.78,
    zIndex: 3,
    pointerEvents: "none" as const,
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,248,240,0.48))",
    border: `1px solid rgba(255,255,255,0.58)`,
    boxShadow: "0 8px 20px rgba(62,45,82,0.07)",
    backdropFilter: "blur(12px)",
  },
```

- [ ] **Step 6: Run visual contract test**

Run:

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```powershell
git add perler-beads\src\pages\mobile\MakingPage.tsx perler-beads\src\styles\mobile-immersive-making.css TEST\mobile_immersive_visual_contract.test.mjs
git commit -m "style: refine mobile immersive status hints"
```

## Task 4: Basic Overlay Motion And Visual Polish

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `perler-beads/src/styles/mobile-immersive-making.css`
- Modify: `TEST/mobile_immersive_visual_contract.test.mjs`

- [ ] **Step 1: Add static assertions for motion-only classes**

Extend `TEST/mobile_immersive_visual_contract.test.mjs`:

```js
test("mobile immersive motion classes are attached to overlay controls only", () => {
  const source = read(makingPagePath);
  assert.match(source, /mobile-immersive-floating-controls/);
  assert.match(source, /mobile-immersive-zoom-controls/);
  assert.match(source, /mobile-immersive-toolbar-shell/);
  assert.match(source, /mobile-immersive-overview-card/);
});
```

- [ ] **Step 2: Run visual contract test and verify it fails if class hooks are missing**

Run:

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

Expected before class hook implementation: FAIL.

- [ ] **Step 3: Attach scoped class names**

Add class names only for mobile immersive mode:

```tsx
          <div ref={singleBoardMobileModeSwitchRef} style={modeSwitchBarStyle}>
```

No class is needed for mode switch because Phase2 Round1 does not animate it.

For the chrome stack:

```tsx
                      <div
                        ref={singleBoardMobileChromeRef}
                        className={mobileImmersiveClass("chrome-stack")}
                        style={singleBoardMobileChromeStackStyle}
                      >
```

For the summary:

```tsx
                      <div
                        className={mobileImmersiveClass("summary-pill")}
                        style={singleBoardMobileSummaryRowStyle}
                      >
```

For the toolbar shell:

```tsx
                      <div
                        className={
                          isSingleBoardMobileImmersive
                            ? `mobile-immersive-layer mobile-immersive-toolbar-shell ${
                                singleBoardMobileToolbarExpanded
                                  ? "mobile-immersive-toolbar-expanded"
                                  : "mobile-immersive-toolbar-collapsed"
                              }`
                            : undefined
                        }
                        style={singleBoardMobileToolbarShellStyle}
                      >
```

For the overview card:

```tsx
                            className={mobileImmersiveClass("overview-card")}
```

For floating controls near the lower controls render:

```tsx
          <div
            className={mobileImmersiveClass("floating-controls")}
            style={floatingControlsStyle}
          >
```

For zoom controls, if the `div` with `zoomControlsStyle` exists inside the floating controls render, add:

```tsx
              className={mobileImmersiveClass("zoom-controls")}
```

- [ ] **Step 4: Refine overlay inline visuals without touching layout properties**

Adjust existing mobile immersive inline styles only for colors, shadows, borders, opacity, and backdrop filters:

```ts
  singleBoardMobileImmersiveSummaryPill: {
    position: "absolute" as const,
    top: "8px",
    left: "8px",
    maxWidth: "calc(100vw - 96px)",
    padding: "5px 8px",
    borderRadius: radius.full,
    background: "rgba(255,255,255,0.58)",
    border: `1px solid rgba(255,255,255,0.62)`,
    boxShadow: "0 10px 22px rgba(62,45,82,0.08)",
    backdropFilter: "blur(14px)",
    zIndex: 4,
    pointerEvents: "auto" as const,
  },
```

```ts
  singleBoardMobileImmersiveToolbarShell: {
    position: "absolute" as const,
    right: "8px",
    bottom: "max(10px, env(safe-area-inset-bottom, 0px))",
    width: "min(186px, calc(100vw - 18px))",
    padding: "5px",
    opacity: 0.9,
    zIndex: 5,
    pointerEvents: "auto" as const,
  },
```

```ts
  singleBoardMobileToolbarShell: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    padding: "5px 6px 6px",
    borderRadius: "18px",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,248,240,0.7))",
    border: `1px solid rgba(255,255,255,0.62)`,
    boxShadow: "0 12px 26px rgba(62,45,82,0.1)",
    backdropFilter: "blur(14px)",
  },
```

Do not change `position`, `right`, `bottom`, `width`, `padding`, pointer events, or any event handlers beyond the class hooks above.

- [ ] **Step 5: Run contract and interaction tests**

Run:

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```powershell
git add perler-beads\src\pages\mobile\MakingPage.tsx perler-beads\src\styles\mobile-immersive-making.css TEST\mobile_immersive_visual_contract.test.mjs
git commit -m "style: add mobile immersive base transitions"
```

## Task 5: Build, MCP Verification, And Client Record

**Files:**
- Create: `MD/client/2026-05-08_mobile_immersive_phase2_round1.md`

- [ ] **Step 1: Run full local verification**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
cmd /c npm.cmd run build
```

The build command must run from `perler-beads`:

```powershell
cmd /c npm.cmd run build
```

Expected: all tests pass and Vite build completes.

- [ ] **Step 2: Run MCP checks in one browser page**

Use the existing Chrome DevTools MCP page when possible. Verify:

- Mobile viewport `390x844`.
- Enter mobile single-board making mode.
- Title bar remains the only layout chrome above the paper area.
- Graph area still fills below title and reaches the bottom.
- Floating controls do not occupy layout height.
- Tool drawer opens and closes with visual transition.
- While tool drawer is open, canvas drag, pinch, tap, and board switching stay frozen.
- 100%, 150%, 200% still allow limited vertical pan.
- 300%+ still allows free drag within normal bounds.
- Multi-board low-zoom edge drag does not accidentally switch boards.
- Reset returns the board to reasonable center.
- Console has no new errors.

- [ ] **Step 3: Write client MD record**

Create `MD/client/2026-05-08_mobile_immersive_phase2_round1.md`:

```md
# 手机端单板沉浸式 Phase2 第一轮体验优化记录

## 范围

- 浮层视觉层级。
- 状态提示视觉。
- 基础动画过渡。

## 未改动

- 手势阈值。
- 切板模型。
- 拖动边界。
- 工具冻结逻辑。
- layout 占高关系。
- 横屏沉浸式。
- 多板沉浸式。

## 验证

- `cmd /c node --test TEST\single_board_interaction.test.mjs`
- `cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs`
- `cmd /c npm.cmd run build`
- MCP 手机视口检查：图纸区域、浮层覆盖、工具冻结、低中倍率微移、高倍率拖动、切板、复位、控制台。

## 回滚边界

本轮按视觉契约、浮层层级、状态提示、基础动画拆分提交。若出现回归，应优先回滚对应单项提交，不回退 Phase1 稳定交互基线。
```

- [ ] **Step 4: Commit final record**

```powershell
git add MD\client\2026-05-08_mobile_immersive_phase2_round1.md
git commit -m "docs: record mobile immersive phase2 round1"
```

## Final Verification Gate

Before claiming completion:

- [ ] `cmd /c node --test TEST\single_board_interaction.test.mjs` passes.
- [ ] `cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs` passes.
- [ ] `cmd /c npm.cmd run build` passes from `perler-beads`.
- [ ] MCP mobile viewport confirms no layout height regression.
- [ ] `git status --short` contains no unexpected uncommitted implementation files.
