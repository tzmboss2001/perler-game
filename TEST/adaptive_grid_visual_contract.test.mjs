import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  "perler-beads/src/pages/mobile/MakingPage.tsx",
  "utf8",
);

test("making page exposes optional grid enhancement without replacing default grid", () => {
  assert.match(source, /gridEnhanceEnabled/);
  assert.match(source, /setGridEnhanceEnabled/);
  assert.match(source, />网格增强</);
  assert.match(source, /rgba\(17,24,39,0\.22\)/);
  assert.match(source, /rgba\(0,0,0,0\.72\)/);
});

test("making page uses adaptive grid helpers with hysteresis and brightness cache", () => {
  assert.match(source, /resolveAdaptiveGridVisibility/);
  assert.match(source, /getAdaptiveGridRegionTone/);
  assert.match(source, /getAdaptiveGridVisualLayers/);
  assert.match(source, /getAdaptiveGridBoostLevel/);
  assert.match(source, /getViewportCenterGridRect/);
  assert.match(source, /adaptiveGridVisibilityRef/);
  assert.match(source, /adaptiveGridToneCacheRef/);
});

test("adaptive grid renders before selected color spotlight keeps visual priority", () => {
  const adaptiveIndex = source.indexOf("drawAdaptiveGridEnhancement");
  const spotlightIndex = source.indexOf(
    'if (selection.type === "color" && highlightedIndices.size > 0)',
  );
  assert.ok(adaptiveIndex > -1);
  assert.ok(spotlightIndex > -1);
  assert.ok(adaptiveIndex < spotlightIndex);
});
