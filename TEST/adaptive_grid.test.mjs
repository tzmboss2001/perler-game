import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdaptiveGridRegionTone,
  getAdaptiveGridVisualLayers,
  resolveAdaptiveGridVisibility,
  getAdaptiveGridBoostLevel,
  getViewportCenterGridRect,
} from "../perler-beads/src/utils/adaptiveGrid.js";

const makeBead = (rgb) => ({
  id: rgb.join("-"),
  hex: `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`,
  rgb,
});

test("adaptive grid region tone buckets light dark and mixed regions", () => {
  const light = makeBead([238, 240, 236]);
  const dark = makeBead([24, 32, 46]);
  const mid = makeBead([130, 132, 135]);

  assert.equal(
    getAdaptiveGridRegionTone({
      beads: Array.from({ length: 16 }, () => light),
      width: 4,
      height: 4,
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 4,
    }),
    "light",
  );

  assert.equal(
    getAdaptiveGridRegionTone({
      beads: Array.from({ length: 16 }, () => dark),
      width: 4,
      height: 4,
      startX: 0,
      startY: 0,
      endX: 4,
      endY: 4,
    }),
    "dark",
  );

  assert.equal(
    getAdaptiveGridRegionTone({
      beads: [light, dark, mid, mid],
      width: 2,
      height: 2,
      startX: 0,
      startY: 0,
      endX: 2,
      endY: 2,
    }),
    "mixed",
  );
});

test("adaptive grid visual layers avoid pure black and pure white while keeping hierarchy", () => {
  const small = getAdaptiveGridVisualLayers({
    tone: "mixed",
    lineKind: "small",
    boostLevel: "none",
    dpr: 2,
  });
  const cross = getAdaptiveGridVisualLayers({
    tone: "dark",
    lineKind: "cross",
    boostLevel: "viewport",
    dpr: 2,
  });
  const guide = getAdaptiveGridVisualLayers({
    tone: "light",
    lineKind: "guide",
    boostLevel: "currentBoard",
    dpr: 2,
  });

  assert.equal(small.length, 2);
  assert.equal(cross.length, 2);
  assert.equal(guide.length, 2);

  const allLayers = [...small, ...cross, ...guide];
  for (const layer of allLayers) {
    assert.match(layer.strokeStyle, /^rgba\(/);
    assert.doesNotMatch(layer.strokeStyle, /rgba\(0,\s*0,\s*0,\s*1\)/);
    assert.doesNotMatch(layer.strokeStyle, /rgba\(255,\s*255,\s*255,\s*1\)/);
    assert.ok(layer.lineWidth > 0);
    assert.ok(layer.lineWidth <= 2);
  }

  assert.ok(guide[1].alpha > cross[1].alpha);
  assert.ok(cross[1].alpha > small[1].alpha);
});

test("adaptive grid visibility uses hysteresis around drawCellSize thresholds", () => {
  const hidden = resolveAdaptiveGridVisibility({
    enabled: true,
    drawCellSize: 8.9,
    previous: {
      smallGrid: true,
      crossGuide: false,
      adaptive: false,
      workingBoost: false,
    },
  });
  assert.equal(hidden.crossGuide, false);
  assert.equal(hidden.adaptive, false);
  assert.equal(hidden.workingBoost, true);

  const shown = resolveAdaptiveGridVisibility({
    enabled: true,
    drawCellSize: 10.2,
    previous: hidden,
  });
  assert.equal(shown.crossGuide, true);
  assert.equal(shown.adaptive, true);
  assert.equal(shown.workingBoost, true);

  const held = resolveAdaptiveGridVisibility({
    enabled: true,
    drawCellSize: 8.8,
    previous: shown,
  });
  assert.equal(held.crossGuide, true);
  assert.equal(held.adaptive, true);

  const disabled = resolveAdaptiveGridVisibility({
    enabled: false,
    drawCellSize: 20,
    previous: shown,
  });
  assert.deepEqual(disabled, {
    smallGrid: true,
    crossGuide: true,
    adaptive: false,
    workingBoost: false,
  });
});

test("adaptive grid working-area boost prioritizes current board over viewport center", () => {
  const currentBoardRect = { startX: 54, startY: 0, endX: 108, endY: 54 };
  const viewportCenterRect = { startX: 0, startY: 0, endX: 54, endY: 54 };

  assert.equal(
    getAdaptiveGridBoostLevel({
      regionRect: { startX: 56, startY: 2, endX: 66, endY: 12 },
      currentBoardRect,
      viewportCenterRect,
    }),
    "currentBoard",
  );
  assert.equal(
    getAdaptiveGridBoostLevel({
      regionRect: { startX: 4, startY: 4, endX: 14, endY: 14 },
      currentBoardRect,
      viewportCenterRect,
    }),
    "viewport",
  );
  assert.equal(
    getAdaptiveGridBoostLevel({
      regionRect: { startX: 160, startY: 0, endX: 170, endY: 10 },
      currentBoardRect,
      viewportCenterRect,
    }),
    "none",
  );
});

test("viewport center grid rect is clamped to artwork bounds", () => {
  assert.deepEqual(
    getViewportCenterGridRect({
      displayStartX: 40,
      displayStartY: 10,
      displayWidth: 20,
      displayHeight: 20,
      artworkWidth: 100,
      artworkHeight: 60,
      physicalBoardSize: 54,
    }),
    {
      startX: 23,
      startY: 0,
      endX: 77,
      endY: 47,
    },
  );
});
