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
  getSingleBoardMobileImmersiveLayerZIndexes,
  getSingleBoardMobileFreezeHint,
  getSingleBoardMobileOverlayInteractionState,
  getSingleBoardMobileOverlayOcclusionState,
  getSingleBoardTaskPrompt,
  getSingleBoardTransientToast,
  getSingleBoardInteractionLockState,
  getSingleBoardLayoutFlags,
  getSingleBoardCurrentColorSummary,
  getSingleBoardWorkflowStatus,
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

test("workflow status summarizes active board row column progress and next pending board", () => {
  assert.deepEqual(
    getSingleBoardWorkflowStatus({
      activeBoardNumber: 3,
      boardCols: 2,
      totalBoardCount: 6,
      doneCount: 2,
      remainingCount: 4,
      boardDone: false,
      nextPendingBoardNumber: 4,
    }),
    {
      boardLabel: "板3",
      boardPositionLabel: "第2行 第1列",
      progressLabel: "2/6",
      remainingLabel: "剩余4块",
      stateLabel: "进行中",
      nextActionLabel: "下一步：完成本板",
      nextPendingLabel: "下一块：板4",
    },
  );
});

test("workflow status handles completed active board without next pending board", () => {
  assert.deepEqual(
    getSingleBoardWorkflowStatus({
      activeBoardNumber: 2,
      boardCols: 2,
      totalBoardCount: 2,
      doneCount: 2,
      remainingCount: 0,
      boardDone: true,
      nextPendingBoardNumber: null,
    }),
    {
      boardLabel: "板2",
      boardPositionLabel: "第1行 第2列",
      progressLabel: "2/2",
      remainingLabel: "全部完成",
      stateLabel: "已完成",
      nextActionLabel: "下一步：导出图纸",
      nextPendingLabel: null,
    },
  );
});

test("current color summary returns selected cell and current board color count", () => {
  assert.deepEqual(
    getSingleBoardCurrentColorSummary({
      selectedCell: { x: 64, y: 81 },
      selectedColorId: "C73",
      selectedColorHex: "#aabbcc",
      colorCountInScope: 12,
      colorCountTotal: 48,
      boardNumber: 3,
      localRow: 28,
      localCol: 11,
    }),
    {
      visible: true,
      colorLabel: "C73",
      colorHex: "#aabbcc",
      cellLabel: "列11 行28",
      boardLabel: "板3",
      countLabel: "本板12颗 / 总计48颗",
    },
  );
});

test("current color summary stays hidden without a selected color", () => {
  assert.deepEqual(
    getSingleBoardCurrentColorSummary({
      selectedCell: null,
      selectedColorId: "",
      selectedColorHex: "",
      colorCountInScope: 0,
      colorCountTotal: 0,
      boardNumber: 1,
      localRow: 1,
      localCol: 1,
    }),
    {
      visible: false,
      colorLabel: "",
      colorHex: "",
      cellLabel: "",
      boardLabel: "",
      countLabel: "",
    },
  );
});

test("single board task prompt stays hidden outside mobile immersive mode", () => {
  assert.deepEqual(
    getSingleBoardTaskPrompt({
      isSingleBoardMode: true,
      isMobileImmersive: false,
      activeBoardIndex: 1,
      totalBoardCount: 4,
      activeBoardCompleted: false,
      activeBoardDoneCount: 0,
      activeBoardTotalCount: 64,
      remainingBoardCount: 4,
    }),
    {
      visible: false,
      level: "passive",
      title: "",
      text: "",
    },
  );
});

test("single board task prompt explains completion and selected work target", () => {
  assert.deepEqual(
    getSingleBoardTaskPrompt({
      isSingleBoardMode: true,
      isMobileImmersive: true,
      activeBoardIndex: 2,
      totalBoardCount: 4,
      activeBoardCompleted: true,
      activeBoardDoneCount: 64,
      activeBoardTotalCount: 64,
      remainingBoardCount: 3,
      nextPendingBoardIndex: 3,
    }),
    {
      visible: true,
      level: "complete",
      title: "本板已完成",
      text: "可以切换到板 3 继续制作",
    },
  );

  assert.deepEqual(
    getSingleBoardTaskPrompt({
      isSingleBoardMode: true,
      isMobileImmersive: true,
      activeBoardIndex: 2,
      totalBoardCount: 4,
      activeBoardCompleted: false,
      activeBoardDoneCount: 12,
      activeBoardTotalCount: 64,
      remainingBoardCount: 4,
      selectedCell: {
        row: 5,
        col: 8,
        colorId: "C29",
      },
    }),
    {
      visible: true,
      level: "action",
      title: "当前格：第5行第8列",
      text: "色号 C29，按当前板位置放豆",
    },
  );

  assert.deepEqual(
    getSingleBoardTaskPrompt({
      isSingleBoardMode: true,
      isMobileImmersive: true,
      activeBoardIndex: 2,
      totalBoardCount: 4,
      activeBoardCompleted: false,
      activeBoardDoneCount: 12,
      activeBoardTotalCount: 64,
      remainingBoardCount: 4,
      selectedColor: {
        id: "C29",
        boardRemainingCount: 12,
      },
    }),
    {
      visible: true,
      level: "action",
      title: "当前色：C29",
      text: "本板剩余 12 颗，可继续找同色格",
    },
  );
});

test("single board task prompt falls back to current board task", () => {
  assert.deepEqual(
    getSingleBoardTaskPrompt({
      isSingleBoardMode: true,
      isMobileImmersive: true,
      activeBoardIndex: 1,
      totalBoardCount: 1,
      activeBoardCompleted: false,
      activeBoardDoneCount: 0,
      activeBoardTotalCount: 64,
      remainingBoardCount: 1,
    }),
    {
      visible: true,
      level: "passive",
      title: "当前任务",
      text: "先按颜色制作本板，完成后再切下一板",
    },
  );

  assert.deepEqual(
    getSingleBoardTaskPrompt({
      isSingleBoardMode: true,
      isMobileImmersive: true,
      activeBoardIndex: 1,
      totalBoardCount: 1,
      activeBoardCompleted: true,
      activeBoardDoneCount: 64,
      activeBoardTotalCount: 64,
      remainingBoardCount: 0,
      nextPendingBoardIndex: null,
    }),
    {
      visible: true,
      level: "complete",
      title: "全部完成",
      text: "可以检查作品或导出图纸",
    },
  );
});

test("single board transient toast explains short state changes", () => {
  assert.deepEqual(
    getSingleBoardTransientToast({
      eventType: "board-switched",
      boardNumber: 3,
    }),
    {
      visible: true,
      eventType: "board-switched",
      title: "已切换到板 3",
      text: "继续按当前板制作",
      durationMs: 1600,
    },
  );

  assert.deepEqual(
    getSingleBoardTransientToast({
      eventType: "color-completed",
      colorId: "C29",
    }),
    {
      visible: true,
      eventType: "color-completed",
      title: "当前颜色完成",
      text: "C29 已完成，可以继续下一个颜色",
      durationMs: 1600,
    },
  );
});

test("single board transient toast stays hidden behind blocking overlays", () => {
  assert.deepEqual(
    getSingleBoardTransientToast({
      eventType: "board-completed",
      blockingOverlayActive: true,
    }),
    {
      visible: false,
      eventType: "board-completed",
      title: "",
      text: "",
      durationMs: 0,
    },
  );
});

test("mobile overlay occlusion guard enters detail focus only for selected high-zoom cells", () => {
  assert.deepEqual(
    getSingleBoardMobileOverlayOcclusionState({
      isSingleBoardMobileImmersive: true,
      scale: 2.8,
      detailModeThreshold: 1.5,
      hasCurrentColorSummary: true,
      toolbarExpanded: false,
      panelOpen: false,
    }),
    {
      detailFocus: true,
      summaryMode: "compact",
      toolbarMode: "weak-hidden",
      zoomMode: "weak-hidden",
    },
  );
});

test("mobile overlay occlusion guard stays normal outside detail focus or while a panel is open", () => {
  assert.equal(
    getSingleBoardMobileOverlayOcclusionState({
      isSingleBoardMobileImmersive: true,
      scale: 1.2,
      detailModeThreshold: 1.5,
      hasCurrentColorSummary: true,
      toolbarExpanded: false,
      panelOpen: false,
    }).detailFocus,
    false,
  );

  assert.deepEqual(
    getSingleBoardMobileOverlayOcclusionState({
      isSingleBoardMobileImmersive: true,
      scale: 2.8,
      detailModeThreshold: 1.5,
      hasCurrentColorSummary: true,
      toolbarExpanded: true,
      panelOpen: false,
    }),
    {
      detailFocus: true,
      summaryMode: "compact",
      toolbarMode: "expanded",
      zoomMode: "weak-hidden",
    },
  );

  assert.equal(
    getSingleBoardMobileOverlayOcclusionState({
      isSingleBoardMobileImmersive: true,
      scale: 2.8,
      detailModeThreshold: 1.5,
      hasCurrentColorSummary: true,
      toolbarExpanded: false,
      panelOpen: true,
    }).detailFocus,
    false,
  );
});

test("mobile overlay interaction state freezes canvas for blocking overlays by priority", () => {
  assert.deepEqual(
    getSingleBoardMobileOverlayInteractionState({
      isSingleBoardMobileImmersive: true,
      toolbarExpanded: true,
      settingsOpen: false,
      overviewOpen: false,
      onboardingOpen: false,
      helpOpen: false,
      modalOpen: false,
      detailFocus: false,
    }),
    {
      activeOverlay: "toolbar",
      priority: 40,
      freezesCanvas: true,
      allowCanvasDrag: false,
      allowCanvasZoom: false,
      allowCanvasTap: false,
      allowBoardSwipe: false,
    },
  );

  assert.deepEqual(
    getSingleBoardMobileOverlayInteractionState({
      isSingleBoardMobileImmersive: true,
      toolbarExpanded: true,
      settingsOpen: true,
      overviewOpen: true,
      onboardingOpen: true,
      helpOpen: true,
      modalOpen: true,
      detailFocus: true,
    }),
    {
      activeOverlay: "modal",
      priority: 90,
      freezesCanvas: true,
      allowCanvasDrag: false,
      allowCanvasZoom: false,
      allowCanvasTap: false,
      allowBoardSwipe: false,
    },
  );
});

test("mobile overlay interaction state keeps passive detail focus draggable and desktop unlocked", () => {
  assert.deepEqual(
    getSingleBoardMobileOverlayInteractionState({
      isSingleBoardMobileImmersive: true,
      toolbarExpanded: false,
      settingsOpen: false,
      overviewOpen: false,
      onboardingOpen: false,
      helpOpen: false,
      modalOpen: false,
      detailFocus: true,
    }),
    {
      activeOverlay: "detail-focus",
      priority: 10,
      freezesCanvas: false,
      allowCanvasDrag: true,
      allowCanvasZoom: true,
      allowCanvasTap: true,
      allowBoardSwipe: true,
    },
  );

  assert.deepEqual(
    getSingleBoardMobileOverlayInteractionState({
      isSingleBoardMobileImmersive: false,
      toolbarExpanded: true,
      settingsOpen: true,
      overviewOpen: true,
      onboardingOpen: true,
      helpOpen: true,
      modalOpen: true,
      detailFocus: true,
    }),
    {
      activeOverlay: "none",
      priority: 0,
      freezesCanvas: false,
      allowCanvasDrag: true,
      allowCanvasZoom: true,
      allowCanvasTap: true,
      allowBoardSwipe: true,
    },
  );
});

test("single board interaction lock state follows overlay freeze decision", () => {
  assert.equal(
    getSingleBoardInteractionLockState({
      isSingleBoardMobileImmersive: true,
      toolbarExpanded: false,
      settingsOpen: false,
      overviewOpen: false,
      onboardingOpen: true,
      helpOpen: false,
      modalOpen: false,
      detailFocus: false,
    }),
    true,
  );

  assert.equal(
    getSingleBoardInteractionLockState({
      isSingleBoardMobileImmersive: true,
      toolbarExpanded: false,
      settingsOpen: false,
      overviewOpen: false,
      onboardingOpen: false,
      helpOpen: false,
      modalOpen: false,
      detailFocus: true,
    }),
    false,
  );
});

test("mobile freeze hint explains why canvas gestures are paused", () => {
  assert.deepEqual(
    getSingleBoardMobileFreezeHint({
      activeOverlay: "toolbar",
      freezesCanvas: true,
    }),
    {
      visible: true,
      title: "工具已展开",
      text: "收起工具后可继续拖动、缩放和切板",
    },
  );

  assert.deepEqual(
    getSingleBoardMobileFreezeHint({
      activeOverlay: "settings",
      freezesCanvas: true,
    }),
    {
      visible: true,
      title: "辅助面板打开中",
      text: "关闭辅助面板后可继续操作图纸",
    },
  );

  assert.deepEqual(
    getSingleBoardMobileFreezeHint({
      activeOverlay: "onboarding",
      freezesCanvas: true,
    }),
    {
      visible: true,
      title: "制作帮助打开中",
      text: "关闭帮助后可继续拖动和缩放图纸",
    },
  );
});

test("mobile freeze hint follows overlay priority and hides for passive states", () => {
  const priorityState = getSingleBoardMobileOverlayInteractionState({
    isSingleBoardMobileImmersive: true,
    toolbarExpanded: true,
    settingsOpen: true,
    overviewOpen: true,
    onboardingOpen: true,
    helpOpen: true,
    modalOpen: true,
    detailFocus: true,
  });

  assert.deepEqual(getSingleBoardMobileFreezeHint(priorityState), {
    visible: true,
    title: "弹窗打开中",
    text: "关闭弹窗后可继续制作",
  });

  assert.deepEqual(
    getSingleBoardMobileFreezeHint({
      activeOverlay: "detail-focus",
      freezesCanvas: false,
    }),
    {
      visible: false,
      title: "",
      text: "",
    },
  );
});

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
