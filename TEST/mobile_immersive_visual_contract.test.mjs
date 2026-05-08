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
