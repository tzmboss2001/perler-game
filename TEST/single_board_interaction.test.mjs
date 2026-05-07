import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCompletedSingleBoardOnboardingState,
  clampSingleBoardMobileOverviewOffset,
  clampSingleBoardMobileOverviewWidth,
  getMakingDesktopSingleBoardUiFlags,
  getMakingDesktopLayoutFlags,
  getMakingDesktopSidebarLayout,
  getTextOverlayTransitionTransform,
  getTextOverlayVisualState,
  getSafeRenderMetricsBudget,
  getColorIdTextStyle,
  getRenderScaleAnchorDelayMs,
  getSingleBoardMobileUiFlags,
  getSingleBoardMobileOverviewLayout,
  getSingleBoardOverviewTitle,
  getTextOverlayStabilizationFrames,
  getSingleBoardAutoFocusScaleDecision,
  getSingleBoardCanvasMinHeight,
  getSingleBoardCanvasWrapperTopOffset,
  getSingleBoardMobileImmersiveControlLayout,
  getSingleBoardMobileImmersiveLayout,
  getSingleBoardLayoutFlags,
  clampMakingStageTranslate,
  getLiveStageDisplayScale,
  getSingleBoardMobileTopChromeOffset,
  getSingleBoardMobileToolbarState,
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

test("making desktop layout flags enable sidebar only on wide fine-pointer single-board view", () => {
  assert.deepEqual(
    getMakingDesktopLayoutFlags({
      viewMode: "singleBoard",
      viewportWidth: 1440,
      pointerFine: true,
    }),
    {
      isSingleBoardMobile: false,
      isSingleBoardDesktop: true,
      useDesktopSidebarLayout: true,
    },
  );
  assert.deepEqual(
    getMakingDesktopLayoutFlags({
      viewMode: "singleBoard",
      viewportWidth: 1100,
      pointerFine: true,
    }),
    {
      isSingleBoardMobile: false,
      isSingleBoardDesktop: true,
      useDesktopSidebarLayout: false,
    },
  );
  assert.deepEqual(
    getMakingDesktopLayoutFlags({
      viewMode: "singleBoard",
      viewportWidth: 1280,
      pointerFine: true,
    }),
    {
      isSingleBoardMobile: false,
      isSingleBoardDesktop: true,
      useDesktopSidebarLayout: true,
    },
  );
  assert.deepEqual(
    getMakingDesktopLayoutFlags({
      viewMode: "singleBoard",
      viewportWidth: 1440,
      pointerFine: false,
    }),
    {
      isSingleBoardMobile: false,
      isSingleBoardDesktop: true,
      useDesktopSidebarLayout: false,
    },
  );
  assert.deepEqual(
    getMakingDesktopLayoutFlags({
      viewMode: "traditional",
      viewportWidth: 1440,
      pointerFine: true,
    }),
    {
      isSingleBoardMobile: false,
      isSingleBoardDesktop: false,
      useDesktopSidebarLayout: false,
    },
  );
});

test("making desktop sidebar layout stays compact when collapsed", () => {
  assert.deepEqual(
    getMakingDesktopSidebarLayout({
      viewportWidth: 1440,
      collapsed: false,
    }),
    {
      width: 264,
      contentPadding: 12,
    },
  );
  assert.deepEqual(
    getMakingDesktopSidebarLayout({
      viewportWidth: 1600,
      collapsed: false,
    }),
    {
      width: 280,
      contentPadding: 12,
    },
  );
  assert.deepEqual(
    getMakingDesktopSidebarLayout({
      viewportWidth: 1440,
      collapsed: true,
    }),
    {
      width: 40,
      contentPadding: 0,
    },
  );
});

test("desktop sidebar single-board mode moves workflow actions out of the main work area", () => {
  assert.deepEqual(
    getMakingDesktopSingleBoardUiFlags({
      viewMode: "singleBoard",
      useDesktopSidebarLayout: true,
      hasSelectedColor: true,
    }),
    {
      isDesktopSidebarSingleBoard: true,
      showMainWorkflowCard: false,
      showToolbarReplaceAction: false,
      showSidebarWorkflowActions: true,
      showSidebarReplaceAction: true,
    },
  );

  assert.deepEqual(
    getMakingDesktopSingleBoardUiFlags({
      viewMode: "singleBoard",
      useDesktopSidebarLayout: false,
      hasSelectedColor: true,
    }),
    {
      isDesktopSidebarSingleBoard: false,
      showMainWorkflowCard: true,
      showToolbarReplaceAction: true,
      showSidebarWorkflowActions: false,
      showSidebarReplaceAction: false,
    },
  );
});

test("mobile single-board mode keeps only core controls in the main toolbar", () => {
  assert.deepEqual(
    getSingleBoardMobileUiFlags({
      viewMode: "singleBoard",
      isSingleBoardMobile: true,
      hasSelectedColor: true,
    }),
    {
      showToolbarOverview: true,
      showToolbarReset: true,
      showToolbarPrimaryComplete: true,
      showToolbarTools: true,
      showToolbarExport: false,
      showToolbarAssist: false,
      showToolbarAutoAdvance: false,
      showToolsReplaceAction: true,
    },
  );

  assert.deepEqual(
    getSingleBoardMobileUiFlags({
      viewMode: "singleBoard",
      isSingleBoardMobile: true,
      hasSelectedColor: false,
    }),
    {
      showToolbarOverview: true,
      showToolbarReset: true,
      showToolbarPrimaryComplete: true,
      showToolbarTools: true,
      showToolbarExport: false,
      showToolbarAssist: false,
      showToolbarAutoAdvance: false,
      showToolsReplaceAction: false,
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
  assert.equal(
    getSingleBoardCanvasMinHeight({
      viewMode: "singleBoard",
      isSingleBoardMobile: true,
      isSingleBoardDesktop: false,
      singleBoardAllDone: false,
    }),
    "clamp(500px, 76vh, 920px)",
  );
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

test("mobile single-board top chrome offset includes summary, toolbar, and swipe status heights", () => {
  assert.equal(
    getSingleBoardMobileTopChromeOffset({
      isSingleBoardMobile: true,
      summaryHeight: 18,
      toolbarHeight: 56,
      swipeStatusHeight: 24,
    }),
    144,
  );
});

test("mobile single-board canvas wrapper keeps local top offset inside canvas container", () => {
  assert.equal(
    getSingleBoardCanvasWrapperTopOffset({
      viewMode: "singleBoard",
      isSingleBoardMobile: true,
      baseOffset: 46,
      pageChromeOffset: 173,
    }),
    46,
  );
});

test("mobile single-board immersive layout removes tool chrome from document flow", () => {
  assert.deepEqual(
    getSingleBoardMobileImmersiveLayout({
      viewMode: "singleBoard",
      isSingleBoardMobile: true,
      singleBoardAllDone: false,
    }),
    {
      enabled: true,
      showBottomNav: false,
      showModeSwitch: false,
      canvasWrapperTopOffset: 0,
      overlayChrome: true,
    },
  );
});

test("mobile single-board immersive layout stays off after all boards are done", () => {
  assert.equal(
    getSingleBoardMobileImmersiveLayout({
      viewMode: "singleBoard",
      isSingleBoardMobile: true,
      singleBoardAllDone: true,
    }).enabled,
    false,
  );
});

test("mobile single-board immersive tool controls stay above zoom controls", () => {
  const layout = getSingleBoardMobileImmersiveControlLayout({
    viewportWidth: 390,
  });

  assert.equal(layout.zoomBottomPx, 10);
  assert.equal(layout.toolbarBottomPx, 58);
  assert.ok(
    layout.toolbarBottomPx >=
      layout.zoomBottomPx + layout.zoomHeightPx + layout.gapPx,
  );
  assert.ok(layout.zoomMaxWidthPx >= 260);
});

test("mobile single-board immersive mode allows conservative pan slack when board is shorter than viewport", () => {
  assert.deepEqual(
    clampMakingStageTranslate({
      x: 0,
      y: 100,
      canvasWidth: 570,
      canvasHeight: 570,
      wrapperWidth: 390,
      wrapperHeight: 791,
      isSingleBoardMobileImmersive: false,
    }),
    { x: 0, y: 0 },
  );

  assert.deepEqual(
    clampMakingStageTranslate({
      x: 0,
      y: 200,
      canvasWidth: 570,
      canvasHeight: 570,
      wrapperWidth: 390,
      wrapperHeight: 791,
      isSingleBoardMobileImmersive: true,
    }),
    { x: 0, y: 118.65 },
  );
});

test("mobile single-board immersive mode keeps normal bounds once board exceeds viewport", () => {
  assert.deepEqual(
    clampMakingStageTranslate({
      x: 240,
      y: 120,
      canvasWidth: 900,
      canvasHeight: 900,
      wrapperWidth: 390,
      wrapperHeight: 791,
      isSingleBoardMobileImmersive: true,
    }),
    { x: 240, y: 54.5 },
  );
});

test("desktop single-board top chrome offset stays disabled", () => {
  assert.equal(
    getSingleBoardMobileTopChromeOffset({
      isSingleBoardMobile: false,
      summaryHeight: 18,
      toolbarHeight: 56,
      swipeStatusHeight: 24,
    }),
    null,
  );
});

test("mobile single-board toolbar state starts expanded and collapses after canvas interaction", () => {
  assert.deepEqual(
    getSingleBoardMobileToolbarState({
      isSingleBoardMobile: true,
      hasInteractedWithCanvas: false,
    }),
    {
      collapsed: false,
    },
  );
  assert.deepEqual(
    getSingleBoardMobileToolbarState({
      isSingleBoardMobile: true,
      hasInteractedWithCanvas: true,
    }),
    {
      collapsed: true,
    },
  );
});

test("desktop single-board toolbar state does not collapse", () => {
  assert.deepEqual(
    getSingleBoardMobileToolbarState({
      isSingleBoardMobile: false,
      hasInteractedWithCanvas: true,
    }),
    {
      collapsed: false,
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

test("live stage display scale uses committed render scale during delayed redraw", () => {
  assert.equal(
    getLiveStageDisplayScale({
      targetScale: 1.5,
      committedRenderScale: 1,
    }),
    1.5,
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

test("single-board mobile overview title falls back safely for zero null and invalid values", () => {
  assert.equal(
    getSingleBoardOverviewTitle({
      activeBoardNumber: 0,
      totalBoardCount: null,
    }),
    "整图总览 · 当前板 1/1",
  );
  assert.equal(
    getSingleBoardOverviewTitle({
      activeBoardNumber: "abc",
      totalBoardCount: "NaN",
    }),
    "整图总览 · 当前板 1/1",
  );
});
