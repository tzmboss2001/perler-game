import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cssPath = new URL(
  "../perler-beads/src/styles/mobile-immersive-making.css",
  import.meta.url,
);
const mainPath = new URL("../perler-beads/src/main.tsx", import.meta.url);
const makingPagePath = new URL(
  "../perler-beads/src/pages/mobile/MakingPage.tsx",
  import.meta.url,
);

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
  assert.match(source, /mobileImmersiveClass\("floating-controls"\)/);
  assert.match(source, /mobile-immersive-toolbar-shell/);
  assert.match(source, /mobileImmersiveClass\("status-hint"\)/);
});

test("mobile immersive status hint stays edge scoped and non-interactive", () => {
  const source = read(makingPagePath);
  assert.match(source, /mobileImmersiveClass\("status-hint"\)/);
  assert.match(source, /pointerEvents:\s*"none"/);
  assert.doesNotMatch(
    source,
    /mobileImmersiveClass\("status-hint"\)[\s\S]{0,300}translateX\(-50%\)/,
  );
});

test("mobile immersive motion classes are attached to overlay controls only", () => {
  const source = read(makingPagePath);
  assert.match(source, /mobileImmersiveClass\("floating-controls"\)/);
  assert.match(source, /mobileImmersiveClass\("zoom-controls"\)/);
  assert.match(source, /mobile-immersive-toolbar-shell/);
  assert.match(source, /mobileImmersiveClass\("overview-card"\)/);
});

test("phase1a occlusion fix keeps detail focus as overlay-only visual state", () => {
  const source = read(makingPagePath);
  assert.match(source, /singleBoardMobileOverlayOcclusionState/);
  assert.match(source, /singleBoardMobileDetailFocusSummaryPill/);
  assert.match(source, /singleBoardMobileDetailFocusToolbarShell/);
  assert.match(source, /singleBoardMobileDetailFocusZoomControls/);
  assert.doesNotMatch(
    source,
    /setScale\([^)]*singleBoardMobileOverlayOcclusionState/,
  );
});

test("making workflow productization status uses mobile immersive overlay hooks", () => {
  const source = read(makingPagePath);
  assert.match(source, /singleBoardWorkflowStatus/);
  assert.match(source, /singleBoardCurrentColorSummary/);
  assert.match(source, /singleBoardMobileCurrentColorPill/);
  assert.match(source, /mobileImmersiveClass\("summary-pill"\)/);
});

test("phase1a lightweight help entry reuses single-board onboarding without new lock state", () => {
  const source = read(makingPagePath);
  assert.match(source, /查看单板制作帮助/);
  assert.match(source, /setShowSingleBoardOnboarding\(true\)/);
  assert.doesNotMatch(source, /showMakingHelp/);
});

test("phase1b freeze model is centralized in the interaction helper", () => {
  const source = read(makingPagePath);
  assert.match(source, /getSingleBoardInteractionLockState/);
  assert.match(source, /onboardingOpen:\s*showSingleBoardOnboarding/);
  assert.doesNotMatch(
    source,
    /isSingleBoardInteractionLocked\s*=\s*[\s\S]{0,120}singleBoardMobileToolbarExpanded\s*\|\|[\s\S]{0,120}showSettings\s*\|\|[\s\S]{0,120}singleBoardMobileMiniMapExpanded/,
  );
});

test("phase1b freeze hint stays in the existing overlay status layer", () => {
  const source = read(makingPagePath);
  assert.match(source, /getSingleBoardMobileFreezeHint/);
  assert.match(source, /singleBoardMobileFreezeHint/);
  assert.match(source, /data-phase1b-freeze-hint/);
  assert.match(source, /mobileImmersiveClass\("status-hint"\)/);
});

test("phase1b toolbar and settings help entries share one opener", () => {
  const source = read(makingPagePath);
  const helperOpenMatches = source.match(/handleOpenSingleBoardHelp/g) || [];
  assert.ok(
    helperOpenMatches.length >= 3,
    "definition plus toolbar and settings entries should reuse one help opener",
  );
  assert.doesNotMatch(source, /title="查看单板制作帮助"[\s\S]{0,160}setShowSingleBoardOnboarding\(true\)/);
});
test("phase1b task clarity overlay uses helper output without layout occupancy", () => {
  const source = read(makingPagePath);
  assert.match(source, /getSingleBoardTaskPrompt/);
  assert.match(source, /singleBoardTaskPrompt/);
  assert.match(source, /data-phase1b-task-prompt/);
  assert.match(source, /mobileImmersiveClass\("status-hint"\)/);
  assert.match(source, /singleBoardMobileFreezeHint\.visible\s*\?\s*\(/);
  assert.match(source, /singleBoardTransientToast\.visible\s*\?\s*\(/);
  assert.doesNotMatch(
    source,
    /data-phase1b-task-prompt[\s\S]{0,240}(paddingTop|marginTop|height):/,
  );
});

test("phase1b transient toast stays overlay-only and does not replace help opener", () => {
  const source = read(makingPagePath);
  assert.match(source, /getSingleBoardTransientToast/);
  assert.match(source, /singleBoardTransientToast/);
  assert.match(source, /data-phase1b-transient-toast/);
  assert.match(source, /pointerEvents:\s*"none"/);
  const helperOpenMatches = source.match(/handleOpenSingleBoardHelp/g) || [];
  assert.ok(
    helperOpenMatches.length >= 3,
    "toast work must not introduce a second help opener",
  );
  assert.doesNotMatch(source, /showTaskHelp/);
});
