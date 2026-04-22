import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompletedSingleBoardOnboardingState,
  clampSingleBoardMobileOverviewOffset,
  clampSingleBoardMobileOverviewWidth,
  getTextOverlayTransitionTransform,
  getTextOverlayVisualState,
  getSafeRenderMetricsBudget,
  getColorIdTextStyle,
  getRenderScaleAnchorDelayMs,
  getSingleBoardMobileOverviewLayout,
  getSingleBoardOverviewTitle,
  getTextOverlayStabilizationFrames,
  getSingleBoardAutoFocusScaleDecision,
  getNeighborBoardNumber,
  getSingleBoardMinScale,
  getSingleBoardSwipeStatus,
  parseSingleBoardOnboardingState,
  resolveSingleBoardSwipeDirection,
  shouldShowSingleBoardMobileOverviewButton,
} from "../perler-beads/src/utils/singleBoardInteraction.js";

test("single board min scale follows fit scale instead of snapping to fit scale", () => {
  assert.equal(getSingleBoardMinScale({ fitScale: 0.63, baseMinScale: 0.2 }), 0.2835);
});

test("neighbor board lookup supports four directions", () => {
  assert.equal(
    getNeighborBoardNumber({
      activeBoardNumber: 3,
      boardCols: 2,
      boardRows: 4,
      direction: "down",
    }),
    5,
  );
  assert.equal(
    getNeighborBoardNumber({
      activeBoardNumber: 3,
      boardCols: 2,
      boardRows: 4,
      direction: "up",
    }),
    1,
  );
});

test("swipe only resolves when near fit scale and at edge", () => {
  const result = resolveSingleBoardSwipeDirection({
    scale: 0.64,
    fitScale: 0.63,
    translationAtEdge: true,
    deltaX: -64,
    deltaY: 8,
    elapsedMs: 180,
  });
  assert.equal(result?.direction, "right");
});

test("swipe stays disabled when scale is far above fit scale", () => {
  const result = resolveSingleBoardSwipeDirection({
    scale: 1.2,
    fitScale: 0.63,
    translationAtEdge: true,
    deltaX: -80,
    deltaY: 0,
    elapsedMs: 120,
  });
  assert.equal(result, null);
});

test("swipe does not resolve when gesture is too diagonal", () => {
  const result = resolveSingleBoardSwipeDirection({
    scale: 0.64,
    fitScale: 0.63,
    translationAtEdge: true,
    deltaX: -64,
    deltaY: 44,
    elapsedMs: 160,
  });
  assert.equal(result, null);
});

test("swipe resolves vertical navigation when dragging upward at edge", () => {
  const result = resolveSingleBoardSwipeDirection({
    scale: 0.64,
    fitScale: 0.63,
    translationAtEdge: true,
    deltaX: 10,
    deltaY: -92,
    elapsedMs: 180,
  });
  assert.equal(result?.direction, "down");
});

test("swipe status locks when current scale is above swipe threshold", () => {
  assert.deepEqual(
    getSingleBoardSwipeStatus({
      isSingleBoardMobile: true,
      scale: 0.67,
      fitScale: 0.63,
      hasNeighborBoard: true,
    }),
    {
      state: "swipe_locked",
      swipeThresholdScale: 0.6615,
    },
  );
});

test("swipe status enters ready state near fit scale without adjacent board", () => {
  assert.deepEqual(
    getSingleBoardSwipeStatus({
      isSingleBoardMobile: true,
      scale: 0.64,
      fitScale: 0.63,
      hasNeighborBoard: false,
    }),
    {
      state: "swipe_ready",
      swipeThresholdScale: 0.6615,
    },
  );
});

test("swipe status enters edge ready state near fit scale with adjacent board", () => {
  assert.deepEqual(
    getSingleBoardSwipeStatus({
      isSingleBoardMobile: true,
      scale: 0.64,
      fitScale: 0.63,
      hasNeighborBoard: true,
    }),
    {
      state: "swipe_edge_ready",
      swipeThresholdScale: 0.6615,
    },
  );
});

test("onboarding state parser handles empty and completed payloads safely", () => {
  assert.deepEqual(parseSingleBoardOnboardingState(null), {
    seen: false,
    completed: false,
  });
  assert.deepEqual(parseSingleBoardOnboardingState("{"), {
    seen: false,
    completed: false,
  });
  assert.deepEqual(
    parseSingleBoardOnboardingState(
      JSON.stringify(buildCompletedSingleBoardOnboardingState()),
    ),
    {
      seen: true,
      completed: true,
    },
  );
});

test("single-board auto focus preserves current zoom for one-board artwork", () => {
  assert.deepEqual(
    getSingleBoardAutoFocusScaleDecision({
      currentScale: 0.59,
      minScale: 0.2194,
      maxScale: 6,
    }),
    {
      mode: "preserve",
      nextScale: 0.59,
    },
  );
});

test("single-board auto focus preserves current zoom for multi-board artwork", () => {
  assert.deepEqual(
    getSingleBoardAutoFocusScaleDecision({
      currentScale: 0.59,
      minScale: 0.2194,
      maxScale: 6,
    }),
    {
      mode: "preserve",
      nextScale: 0.59,
    },
  );
});

test("single-board auto focus clamps scale into legal range", () => {
  assert.deepEqual(
    getSingleBoardAutoFocusScaleDecision({
      currentScale: 0.1,
      minScale: 0.2194,
      maxScale: 6,
    }),
    {
      mode: "preserve",
      nextScale: 0.2194,
    },
  );
  assert.deepEqual(
    getSingleBoardAutoFocusScaleDecision({
      currentScale: 8,
      minScale: 0.2194,
      maxScale: 6,
    }),
    {
      mode: "preserve",
      nextScale: 6,
    },
  );
});

test("text overlay stabilization adds extra frames when render metrics change at max zoom", () => {
  assert.equal(
    getTextOverlayStabilizationFrames({
      scale: 6,
      renderMaxScale: 6,
      renderScaleChanged: true,
      canvasMetricsChanged: false,
    }),
    3,
  );
});

test("text overlay stabilization stays lightweight away from max zoom", () => {
  assert.equal(
    getTextOverlayStabilizationFrames({
      scale: 3.2,
      renderMaxScale: 6,
      renderScaleChanged: true,
      canvasMetricsChanged: false,
    }),
    2,
  );
  assert.equal(
    getTextOverlayStabilizationFrames({
      scale: 3.2,
      renderMaxScale: 6,
      renderScaleChanged: false,
      canvasMetricsChanged: false,
    }),
    1,
  );
});

test("color id text style stays below visual fill ratio at max zoom", () => {
  const style = getColorIdTextStyle({
    cellScreenSize: 60,
    labelText: "CE12",
  });

  assert.equal(style.fontSize <= 16, true);
  assert.equal(style.maxTextWidth <= 35, true);
});

test("longer color ids are slightly more conservative than short ones", () => {
  const shortStyle = getColorIdTextStyle({
    cellScreenSize: 60,
    labelText: "C23",
  });
  const longStyle = getColorIdTextStyle({
    cellScreenSize: 60,
    labelText: "CE12",
  });

  assert.equal(longStyle.fontSize < shortStyle.fontSize, true);
  assert.equal(longStyle.maxTextWidth < 60 * 0.62, true);
});

test("ios webkit render budget is more conservative than default budget", () => {
  const commonInput = {
    width: 54,
    height: 80,
    baseCellSize: 24,
    scale: 6,
    devicePixelRatio: 3,
  };

  const normal = getSafeRenderMetricsBudget({
    ...commonInput,
    isIOSWebKit: false,
  });
  const ios = getSafeRenderMetricsBudget({
    ...commonInput,
    isIOSWebKit: true,
    layerCount: 2,
  });

  assert.equal(ios.dpr <= normal.dpr, true);
  assert.equal(ios.renderScale <= normal.renderScale, true);
  assert.equal(ios.safeRenderCanvasWidth <= normal.safeRenderCanvasWidth, true);
  assert.equal(ios.safeRenderCanvasHeight <= normal.safeRenderCanvasHeight, true);
  assert.equal(ios.safeRenderCanvasHeight * ios.dpr <= 4096, true);
  assert.equal(
    ios.safeRenderCanvasWidth * ios.safeRenderCanvasHeight * ios.dpr * ios.dpr * 2 <= 24000000,
    true,
  );
});

test("desktop fine pointer keeps render-scale anchor in sync without delay", () => {
  assert.equal(
    getRenderScaleAnchorDelayMs({
      hasFinePointer: true,
      isIOSWebKit: false,
    }),
    0,
  );
});

test("touch-like environments keep delayed render-scale anchor stabilization", () => {
  assert.equal(
    getRenderScaleAnchorDelayMs({
      hasFinePointer: false,
      isIOSWebKit: false,
    }),
    140,
  );
  assert.equal(
    getRenderScaleAnchorDelayMs({
      hasFinePointer: true,
      isIOSWebKit: true,
    }),
    140,
  );
});

test("text overlay visual state derives stage position and cell size from render metrics", () => {
  assert.deepEqual(
    getTextOverlayVisualState({
      wrapperWidth: 400,
      wrapperHeight: 300,
      safeRenderCanvasWidth: 240,
      safeRenderCanvasHeight: 240,
      safeRenderCellSize: 10,
      renderScale: 1,
      scale: 5.2,
      translateX: -20,
      translateY: 30,
    }),
    {
      stageLeft: -444,
      stageTop: -444,
      cellScreenSize: 52,
    },
  );
});

test("text overlay live transform keeps scaling continuous from current size", () => {
  assert.deepEqual(
    getTextOverlayTransitionTransform({
      prevVisualState: {
        stageLeft: 80,
        stageTop: 60,
        cellScreenSize: 20,
      },
      nextVisualState: {
        stageLeft: 40,
        stageTop: 20,
        cellScreenSize: 40,
      },
    }),
    {
      scale: 2,
      translateX: -120,
      translateY: -100,
    },
  );
});

test("mobile single-board overview button remains visible for one-board artwork", () => {
  assert.equal(
    shouldShowSingleBoardMobileOverviewButton({
      isSingleBoardMobile: true,
      hasActiveBoardRect: true,
    }),
    true,
  );
  assert.equal(
    shouldShowSingleBoardMobileOverviewButton({
      isSingleBoardMobile: false,
      hasActiveBoardRect: true,
    }),
    false,
  );
});

test("mobile single-board overview layout stays centered inside the viewport", () => {
  assert.deepEqual(
    getSingleBoardMobileOverviewLayout({
      viewportWidth: 390,
      viewportHeight: 844,
      offsetX: 0,
      offsetY: 0,
    }),
    {
      width: 220,
      maxHeight: 280,
      left: 85,
      top: 282,
      minLeft: 16,
      maxLeft: 154,
      minTop: 108,
      maxTop: 456,
      minWidth: 176,
      maxWidth: 280,
    },
  );
});

test("mobile single-board overview drag offset is clamped to visible bounds", () => {
  const layout = getSingleBoardMobileOverviewLayout({
    viewportWidth: 390,
    viewportHeight: 844,
    offsetX: 0,
    offsetY: 0,
  });

  assert.deepEqual(
    clampSingleBoardMobileOverviewOffset({
      nextOffsetX: 120,
      nextOffsetY: 300,
      baseLeft: layout.left,
      baseTop: layout.top,
      minLeft: layout.minLeft,
      maxLeft: layout.maxLeft,
      minTop: layout.minTop,
      maxTop: layout.maxTop,
    }),
    {
      offsetX: 69,
      offsetY: 174,
    },
  );
});

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
      maxHeight: 331,
      left: 65,
      top: 257,
      minLeft: 16,
      maxLeft: 114,
      minTop: 108,
      maxTop: 405,
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

test("single-board mobile overview title explicitly tracks the active board", () => {
  assert.equal(
    getSingleBoardOverviewTitle({
      activeBoardNumber: 1,
      totalBoardCount: 2,
    }),
    "整图总览 · 当前板 1/2",
  );
  assert.equal(
    getSingleBoardOverviewTitle({
      activeBoardNumber: 1,
      totalBoardCount: 1,
    }),
    "整图总览 · 当前板 1/1",
  );
});
