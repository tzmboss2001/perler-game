/**
 * @param {{ fitScale: number; baseMinScale: number }} input
 */
export function getSingleBoardMinScale({ fitScale, baseMinScale }) {
  return Number(Math.max(baseMinScale, fitScale * 0.45).toFixed(4));
}

/**
 * @param {{
 *   viewMode: string;
 *   viewportWidth: number;
 * }} input
 */
export function getSingleBoardLayoutFlags({ viewMode, viewportWidth }) {
  const isSingleBoardMobile =
    viewMode === "singleBoard" && viewportWidth <= 640;
  return {
    isSingleBoardMobile,
    isSingleBoardDesktop: viewMode === "singleBoard" && viewportWidth > 640,
  };
}

/**
 * @param {{
 *   viewMode: string;
 *   isSingleBoardMobile: boolean;
 *   hasSelectedColor: boolean;
 * }} input
 */
export function getSingleBoardMobileUiFlags({
  viewMode,
  isSingleBoardMobile,
  hasSelectedColor,
}) {
  const isMobileSingleBoard = Boolean(
    viewMode === "singleBoard" && isSingleBoardMobile,
  );

  if (!isMobileSingleBoard) {
    return {
      showToolbarOverview: false,
      showToolbarReset: false,
      showToolbarPrimaryComplete: false,
      showToolbarTools: false,
      showToolbarExport: true,
      showToolbarAssist: true,
      showToolbarAutoAdvance: true,
      showToolsReplaceAction: false,
    };
  }

  return {
    showToolbarOverview: true,
    showToolbarReset: true,
    showToolbarPrimaryComplete: true,
    showToolbarTools: true,
    showToolbarExport: false,
    showToolbarAssist: false,
    showToolbarAutoAdvance: false,
    showToolsReplaceAction: Boolean(hasSelectedColor),
  };
}

/**
 * @param {{
 *   viewMode: string;
 *   viewportWidth: number;
 *   pointerFine: boolean;
 * }} input
 */
export function getMakingDesktopLayoutFlags({
  viewMode,
  viewportWidth,
  pointerFine,
}) {
  const { isSingleBoardMobile, isSingleBoardDesktop } =
    getSingleBoardLayoutFlags({
      viewMode,
      viewportWidth,
    });
  return {
    isSingleBoardMobile,
    isSingleBoardDesktop,
    useDesktopSidebarLayout: Boolean(
      isSingleBoardDesktop && pointerFine && viewportWidth >= 1280,
    ),
  };
}

/**
 * @param {{
 *   viewportWidth: number;
 *   collapsed: boolean;
 * }} input
 */
export function getMakingDesktopSidebarLayout({ viewportWidth, collapsed }) {
  return {
    width: collapsed ? 40 : viewportWidth >= 1600 ? 280 : 264,
    contentPadding: collapsed ? 0 : 12,
  };
}

/**
 * @param {{
 *   viewMode: string;
 *   useDesktopSidebarLayout: boolean;
 *   hasSelectedColor: boolean;
 * }} input
 */
export function getMakingDesktopSingleBoardUiFlags({
  viewMode,
  useDesktopSidebarLayout,
  hasSelectedColor,
}) {
  const isDesktopSidebarSingleBoard = Boolean(
    viewMode === "singleBoard" && useDesktopSidebarLayout,
  );
  return {
    isDesktopSidebarSingleBoard,
    showMainWorkflowCard: !isDesktopSidebarSingleBoard,
    showToolbarReplaceAction: !isDesktopSidebarSingleBoard,
    showSidebarWorkflowActions: isDesktopSidebarSingleBoard,
    showSidebarReplaceAction: Boolean(
      isDesktopSidebarSingleBoard && hasSelectedColor,
    ),
  };
}

/**
 * @param {{
 *   viewMode: string;
 *   isSingleBoardMobile: boolean;
 *   isSingleBoardDesktop: boolean;
 *   singleBoardAllDone: boolean;
 * }} input
 */
export function getSingleBoardCanvasMinHeight({
  viewMode,
  isSingleBoardMobile,
  isSingleBoardDesktop,
  singleBoardAllDone,
}) {
  if (viewMode !== "singleBoard") return undefined;
  if (isSingleBoardDesktop) {
    return singleBoardAllDone
      ? "clamp(460px, 72vh, 860px)"
      : "clamp(560px, 80vh, 980px)";
  }
  return isSingleBoardMobile && !singleBoardAllDone
    ? "clamp(500px, 76vh, 920px)"
    : "clamp(420px, 68vh, 760px)";
}

/**
 * @param {{
 *   viewMode: string;
 *   isSingleBoardMobile: boolean;
 *   singleBoardAllDone: boolean;
 * }} input
 */
export function getSingleBoardMobileImmersiveLayout({
  viewMode,
  isSingleBoardMobile,
  singleBoardAllDone,
}) {
  const enabled = Boolean(
    viewMode === "singleBoard" &&
      isSingleBoardMobile &&
      !singleBoardAllDone,
  );

  return {
    enabled,
    showBottomNav: !enabled,
    showModeSwitch: !enabled,
    canvasWrapperTopOffset: enabled ? 0 : null,
    overlayChrome: enabled,
  };
}

/**
 * @param {{ viewportWidth: number }} input
 */
export function getSingleBoardMobileImmersiveControlLayout({
  viewportWidth,
}) {
  const zoomBottomPx = 10;
  const zoomHeightPx = 38;
  const gapPx = 10;
  const toolbarBottomPx = zoomBottomPx + zoomHeightPx + gapPx;
  const safeViewportWidth = Number.isFinite(viewportWidth)
    ? Math.max(viewportWidth, 0)
    : 0;
  const zoomMaxWidthPx = Math.max(
    220,
    Math.min(320, safeViewportWidth - 16),
  );

  return {
    zoomBottomPx,
    zoomHeightPx,
    gapPx,
    toolbarBottomPx,
    zoomMaxWidthPx,
    zoomButtonMinWidthPx: 28,
  };
}

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

const SINGLE_BOARD_OVERLAY_PRIORITY = [
  ["modal", 90],
  ["help", 70],
  ["onboarding", 70],
  ["settings", 60],
  ["overview", 50],
  ["toolbar", 40],
  ["detail-focus", 10],
];

function buildSingleBoardOverlayState(activeOverlay, priority, freezesCanvas) {
  return {
    activeOverlay,
    priority,
    freezesCanvas,
    allowCanvasDrag: !freezesCanvas,
    allowCanvasZoom: !freezesCanvas,
    allowCanvasTap: !freezesCanvas,
    allowBoardSwipe: !freezesCanvas,
  };
}

/**
 * @param {{
 *   isSingleBoardMobileImmersive: boolean;
 *   toolbarExpanded?: boolean;
 *   settingsOpen?: boolean;
 *   overviewOpen?: boolean;
 *   onboardingOpen?: boolean;
 *   helpOpen?: boolean;
 *   modalOpen?: boolean;
 *   detailFocus?: boolean;
 * }} input
 */
export function getSingleBoardMobileOverlayInteractionState({
  isSingleBoardMobileImmersive,
  toolbarExpanded = false,
  settingsOpen = false,
  overviewOpen = false,
  onboardingOpen = false,
  helpOpen = false,
  modalOpen = false,
  detailFocus = false,
}) {
  if (!isSingleBoardMobileImmersive) {
    return buildSingleBoardOverlayState("none", 0, false);
  }

  const overlayFlags = {
    modal: modalOpen,
    help: helpOpen,
    onboarding: onboardingOpen,
    settings: settingsOpen,
    overview: overviewOpen,
    toolbar: toolbarExpanded,
    "detail-focus": detailFocus,
  };
  const active = SINGLE_BOARD_OVERLAY_PRIORITY.find(
    ([overlay]) => overlayFlags[overlay],
  );

  if (!active) {
    return buildSingleBoardOverlayState("none", 0, false);
  }

  const [activeOverlay, priority] = active;
  return buildSingleBoardOverlayState(
    activeOverlay,
    priority,
    priority >= 40,
  );
}

/**
 * @param {{
 *   isSingleBoardMobileImmersive: boolean;
 *   toolbarExpanded?: boolean;
 *   settingsOpen?: boolean;
 *   overviewOpen?: boolean;
 *   onboardingOpen?: boolean;
 *   helpOpen?: boolean;
 *   modalOpen?: boolean;
 *   detailFocus?: boolean;
 * }} input
 */
export function getSingleBoardInteractionLockState(input) {
  return getSingleBoardMobileOverlayInteractionState(input).freezesCanvas;
}

const SINGLE_BOARD_FREEZE_HINT_COPY = {
  modal: {
    title: "弹窗打开中",
    text: "关闭弹窗后可继续制作",
  },
  help: {
    title: "制作帮助打开中",
    text: "关闭帮助后可继续拖动和缩放图纸",
  },
  onboarding: {
    title: "制作帮助打开中",
    text: "关闭帮助后可继续拖动和缩放图纸",
  },
  settings: {
    title: "辅助面板打开中",
    text: "关闭辅助面板后可继续操作图纸",
  },
  overview: {
    title: "总览打开中",
    text: "收起总览后可继续拖动、缩放和切板",
  },
  toolbar: {
    title: "工具已展开",
    text: "收起工具后可继续拖动、缩放和切板",
  },
};

/**
 * @param {{
 *   activeOverlay: string;
 *   freezesCanvas: boolean;
 * }} input
 */
export function getSingleBoardMobileFreezeHint({ activeOverlay, freezesCanvas }) {
  if (!freezesCanvas) {
    return {
      visible: false,
      title: "",
      text: "",
    };
  }

  const copy = SINGLE_BOARD_FREEZE_HINT_COPY[activeOverlay] || {
    title: "操作暂停中",
    text: "关闭当前浮层后可继续操作图纸",
  };

  return {
    visible: true,
    title: copy.title,
    text: copy.text,
  };
}

const EMPTY_SINGLE_BOARD_TASK_PROMPT = {
  visible: false,
  level: "passive",
  title: "",
  text: "",
};

function toPositiveDisplayNumber(value, fallback = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

/**
 * @param {{
 *   isSingleBoardMode: boolean;
 *   isMobileImmersive: boolean;
 *   activeBoardIndex: number;
 *   totalBoardCount: number;
 *   activeBoardRow?: number;
 *   activeBoardCol?: number;
 *   activeBoardCompleted: boolean;
 *   activeBoardDoneCount: number;
 *   activeBoardTotalCount: number;
 *   remainingBoardCount: number;
 *   detailFocus?: boolean;
 *   selectedCell?: { row: number; col: number; colorId?: string } | null;
 *   selectedColor?: { id: string; boardRemainingCount: number } | null;
 *   nextPendingBoardIndex?: number | null;
 * }} input
 */
export function getSingleBoardTaskPrompt({
  isSingleBoardMode,
  isMobileImmersive,
  activeBoardCompleted,
  remainingBoardCount,
  detailFocus = false,
  selectedCell = null,
  selectedColor = null,
  nextPendingBoardIndex = null,
}) {
  if (!isSingleBoardMode || !isMobileImmersive) {
    return EMPTY_SINGLE_BOARD_TASK_PROMPT;
  }

  if (activeBoardCompleted) {
    if (remainingBoardCount <= 0 || nextPendingBoardIndex === null) {
      return {
        visible: true,
        level: "complete",
        title: "全部完成",
        text: "可以检查作品或导出图纸",
      };
    }

    return {
      visible: true,
      level: "complete",
      title: "本板已完成",
      text: `可以切换到板 ${toPositiveDisplayNumber(
        nextPendingBoardIndex,
      )} 继续制作`,
    };
  }

  if (detailFocus && (selectedCell || selectedColor?.id)) {
    return EMPTY_SINGLE_BOARD_TASK_PROMPT;
  }

  if (selectedCell) {
    const row = toPositiveDisplayNumber(selectedCell.row);
    const col = toPositiveDisplayNumber(selectedCell.col);
    const colorId = String(selectedCell.colorId || "").trim();
    return {
      visible: true,
      level: "action",
      title: `当前格：第${row}行第${col}列`,
      text: colorId
        ? `色号 ${colorId}，按当前板位置放豆`
        : "按当前板位置放豆",
    };
  }

  if (selectedColor?.id) {
    const colorId = String(selectedColor.id).trim();
    const remainingCount = Math.max(
      0,
      Math.floor(Number(selectedColor.boardRemainingCount) || 0),
    );
    return {
      visible: true,
      level: "action",
      title: `当前色：${colorId}`,
      text: `本板剩余 ${remainingCount} 颗，可继续找同色格`,
    };
  }

  return {
    visible: true,
    level: "passive",
    title: "当前任务",
    text: "先按颜色制作本板，完成后再切下一板",
  };
}

function hiddenSingleBoardTransientToast(eventType) {
  return {
    visible: false,
    eventType,
    title: "",
    text: "",
    durationMs: 0,
  };
}

/**
 * @param {{
 *   eventType:
 *     | "color-completed"
 *     | "board-completed"
 *     | "board-switched"
 *     | "view-reset"
 *     | "help-opened"
 *     | "help-closed";
 *   boardNumber?: number;
 *   colorId?: string;
 *   blockingOverlayActive?: boolean;
 * }} input
 */
export function getSingleBoardTransientToast({
  eventType,
  boardNumber,
  colorId,
  blockingOverlayActive = false,
}) {
  if (blockingOverlayActive) {
    return hiddenSingleBoardTransientToast(eventType);
  }

  const durationMs = 1600;
  const safeBoardNumber = toPositiveDisplayNumber(boardNumber);
  const safeColorId = String(colorId || "").trim();

  const copyByEventType = {
    "color-completed": {
      title: "当前颜色完成",
      text: safeColorId
        ? `${safeColorId} 已完成，可以继续下一个颜色`
        : "可以继续下一个颜色或检查漏格",
    },
    "board-completed": {
      title: "本板已完成",
      text: "可以切换下一板继续制作",
    },
    "board-switched": {
      title: `已切换到板 ${safeBoardNumber}`,
      text: "继续按当前板制作",
    },
    "view-reset": {
      title: "视图已复位",
      text: "回到适合当前板的查看位置",
    },
    "help-opened": {
      title: "制作帮助已打开",
      text: "关闭后可继续操作图纸",
    },
    "help-closed": {
      title: "继续制作",
      text: "拖动、缩放和切板已恢复",
    },
  };

  const copy = copyByEventType[eventType];
  if (!copy) {
    return hiddenSingleBoardTransientToast(eventType);
  }

  return {
    visible: true,
    eventType,
    title: copy.title,
    text: copy.text,
    durationMs,
  };
}

/**
 * @param {{
 *   activeBoardNumber: number;
 *   boardCols: number;
 *   totalBoardCount: number;
 *   doneCount: number;
 *   remainingCount: number;
 *   boardDone: boolean;
 *   nextPendingBoardNumber: number | null;
 * }} input
 */
export function getSingleBoardWorkflowStatus({
  activeBoardNumber,
  boardCols,
  totalBoardCount,
  doneCount,
  remainingCount,
  boardDone,
  nextPendingBoardNumber,
}) {
  const safeBoard = Math.max(1, Math.floor(Number(activeBoardNumber) || 1));
  const safeCols = Math.max(1, Math.floor(Number(boardCols) || 1));
  const row = Math.floor((safeBoard - 1) / safeCols) + 1;
  const col = ((safeBoard - 1) % safeCols) + 1;
  const safeTotal = Math.max(0, Math.floor(Number(totalBoardCount) || 0));
  const safeDone = Math.max(0, Math.floor(Number(doneCount) || 0));
  const safeRemaining = Math.max(0, Math.floor(Number(remainingCount) || 0));
  const hasNextPending =
    nextPendingBoardNumber !== null &&
    nextPendingBoardNumber !== undefined &&
    Number.isFinite(Number(nextPendingBoardNumber));

  return {
    boardLabel: `板${safeBoard}`,
    boardPositionLabel: `第${row}行 第${col}列`,
    progressLabel: `${safeDone}/${safeTotal}`,
    remainingLabel: safeRemaining > 0 ? `剩余${safeRemaining}块` : "全部完成",
    stateLabel: boardDone ? "已完成" : "进行中",
    nextActionLabel: boardDone
      ? hasNextPending
        ? `下一步：继续板${nextPendingBoardNumber}`
        : "下一步：导出图纸"
      : "下一步：完成本板",
    nextPendingLabel: hasNextPending ? `下一块：板${nextPendingBoardNumber}` : null,
  };
}

/**
 * @param {{
 *   selectedCell: { x: number; y: number } | null;
 *   selectedColorId: string | undefined;
 *   selectedColorHex: string | undefined;
 *   colorCountInScope: number;
 *   colorCountTotal: number;
 *   boardNumber: number;
 *   localRow: number;
 *   localCol: number;
 * }} input
 */
export function getSingleBoardCurrentColorSummary({
  selectedCell,
  selectedColorId,
  selectedColorHex,
  colorCountInScope,
  colorCountTotal,
  boardNumber,
  localRow,
  localCol,
}) {
  if (!selectedCell || !selectedColorHex) {
    return {
      visible: false,
      colorLabel: "",
      colorHex: "",
      cellLabel: "",
      boardLabel: "",
      countLabel: "",
    };
  }

  const colorLabel = selectedColorId || selectedColorHex;
  return {
    visible: true,
    colorLabel,
    colorHex: selectedColorHex,
    cellLabel: `列${localCol} 行${localRow}`,
    boardLabel: `板${boardNumber}`,
    countLabel: `本板${colorCountInScope}颗 / 总计${colorCountTotal}颗`,
  };
}

/**
 * @param {{
 *   isSingleBoardMobileImmersive: boolean;
 *   scale: number;
 *   detailModeThreshold: number;
 *   hasCurrentColorSummary: boolean;
 *   toolbarExpanded: boolean;
 *   panelOpen: boolean;
 * }} input
 */
export function getSingleBoardMobileOverlayOcclusionState({
  isSingleBoardMobileImmersive,
  scale,
  detailModeThreshold,
  hasCurrentColorSummary,
  toolbarExpanded,
  panelOpen,
}) {
  const safeScale = Number(scale) || 0;
  const safeThreshold = Math.max(0, Number(detailModeThreshold) || 0);
  const detailFocus =
    Boolean(isSingleBoardMobileImmersive) &&
    !panelOpen &&
    Boolean(hasCurrentColorSummary) &&
    safeScale >= safeThreshold;

  if (!detailFocus) {
    return {
      detailFocus: false,
      summaryMode: "normal",
      toolbarMode: "normal",
      zoomMode: "normal",
    };
  }

  return {
    detailFocus: true,
    summaryMode: "compact",
    toolbarMode: toolbarExpanded ? "expanded" : "weak-hidden",
    zoomMode: "weak-hidden",
  };
}

/**
 * @param {{
 *   currentScale: number;
 *   minScale: number;
 *   maxScale: number;
 * }} input
 */
export function getSingleBoardAutoFocusScaleDecision({
  currentScale,
  minScale,
  maxScale,
}) {
  return {
    mode: "preserve",
    nextScale: Number(
      Math.min(maxScale, Math.max(minScale, currentScale)).toFixed(4),
    ),
  };
}

/**
 * @param {{
 *   x: number;
 *   y: number;
 *   canvasWidth: number;
 *   canvasHeight: number;
 *   wrapperWidth: number;
 *   wrapperHeight: number;
 *   isSingleBoardMobileImmersive?: boolean;
 * }} input
 */
export function clampMakingStageTranslate({
  x,
  y,
  canvasWidth,
  canvasHeight,
  wrapperWidth,
  wrapperHeight,
  isSingleBoardMobileImmersive = false,
}) {
  const maxOffsetX = Math.max(0, (canvasWidth - wrapperWidth) / 2);
  const overflowOffsetY = Math.max(0, (canvasHeight - wrapperHeight) / 2);
  const immersiveVerticalSlack =
    isSingleBoardMobileImmersive && overflowOffsetY <= 0
      ? Math.min(120, wrapperHeight * 0.15)
      : 0;
  const maxOffsetY =
    overflowOffsetY > 0 ? overflowOffsetY : immersiveVerticalSlack;

  return {
    x: Number(Math.min(maxOffsetX, Math.max(-maxOffsetX, x)).toFixed(4)),
    y: Number(Math.min(maxOffsetY, Math.max(-maxOffsetY, y)).toFixed(4)),
  };
}

/**
 * @param {{
 *   scale: number;
 *   renderMaxScale: number;
 *   renderScaleChanged: boolean;
 *   canvasMetricsChanged: boolean;
 * }} input
 */
export function getTextOverlayStabilizationFrames({
  scale,
  renderMaxScale,
  renderScaleChanged,
  canvasMetricsChanged,
}) {
  if (!renderScaleChanged && !canvasMetricsChanged) {
    return 1;
  }

  const nearMaxScale = scale >= renderMaxScale - 0.001;
  return nearMaxScale ? 3 : 2;
}

/**
 * @param {{
 *   hasFinePointer: boolean;
 *   isIOSWebKit: boolean;
 * }} input
 */
export function getRenderScaleAnchorDelayMs({
  hasFinePointer,
  isIOSWebKit,
}) {
  if (hasFinePointer && !isIOSWebKit) {
    return 0;
  }

  return 140;
}

/**
 * @param {{
 *   targetScale: number;
 *   committedRenderScale: number;
 * }} input
 */
export function getLiveStageDisplayScale({
  targetScale,
  committedRenderScale,
}) {
  return Math.max(
    1,
    targetScale / Math.max(committedRenderScale, 0.0001),
  );
}

/**
 * @param {{
 *   wrapperWidth: number;
 *   wrapperHeight: number;
 *   safeRenderCanvasWidth: number;
 *   safeRenderCanvasHeight: number;
 *   safeRenderCellSize: number;
 *   renderScale: number;
 *   scale: number;
 *   translateX: number;
 *   translateY: number;
 * }} input
 */
export function getTextOverlayVisualState({
  wrapperWidth,
  wrapperHeight,
  safeRenderCanvasWidth,
  safeRenderCanvasHeight,
  safeRenderCellSize,
  renderScale,
  scale,
  translateX,
  translateY,
}) {
  const currentDisplayScale = Math.max(
    1,
    scale / Math.max(renderScale, 0.0001),
  );
  const visualCanvasWidth = safeRenderCanvasWidth * currentDisplayScale;
  const visualCanvasHeight = safeRenderCanvasHeight * currentDisplayScale;
  return {
    stageLeft: Number(
      (((wrapperWidth - visualCanvasWidth) / 2) + translateX).toFixed(4),
    ),
    stageTop: Number(
      (((wrapperHeight - visualCanvasHeight) / 2) + translateY).toFixed(4),
    ),
    cellScreenSize: Number(
      (safeRenderCellSize * currentDisplayScale).toFixed(4),
    ),
  };
}

/**
 * @param {{
 *   prevVisualState: { stageLeft: number; stageTop: number; cellScreenSize: number } | null;
 *   nextVisualState: { stageLeft: number; stageTop: number; cellScreenSize: number } | null;
 * }} input
 */
export function getTextOverlayTransitionTransform({
  prevVisualState,
  nextVisualState,
}) {
  if (
    !prevVisualState ||
    !nextVisualState ||
    prevVisualState.cellScreenSize <= 0 ||
    nextVisualState.cellScreenSize <= 0
  ) {
    return null;
  }

  const scale = nextVisualState.cellScreenSize / prevVisualState.cellScreenSize;
  return {
    scale: Number(scale.toFixed(4)),
    translateX: Number(
      (nextVisualState.stageLeft - scale * prevVisualState.stageLeft).toFixed(
        4,
      ),
    ),
    translateY: Number(
      (nextVisualState.stageTop - scale * prevVisualState.stageTop).toFixed(4),
    ),
  };
}

/**
 * @param {{
 *   cellScreenSize: number;
 *   labelText: string;
 * }} input
 */
export function getColorIdTextStyle({ cellScreenSize, labelText }) {
  const text = String(labelText || "");
  const textLength = Math.max(1, text.length);
  const widthRatio = textLength >= 4 ? 0.58 : 0.62;
  const maxTextWidth = Number((cellScreenSize * widthRatio).toFixed(2));

  const softenedGrowth = Math.min(
    16,
    Math.max(11, 10.5 + Math.sqrt(Math.max(0, cellScreenSize - 10)) * 0.9),
  );
  const lengthTightening = Math.max(0, (textLength - 3) * 0.8);
  const estimatedCharWidth = 0.55;
  const widthLimitedFont = maxTextWidth / Math.max(textLength * estimatedCharWidth, 1);
  const fontSize = Number(
    Math.max(11, Math.min(softenedGrowth - lengthTightening, widthLimitedFont)).toFixed(2),
  );

  return {
    fontSize,
    maxTextWidth,
    lineWidth:
      cellScreenSize < 18 ? Math.max(0.45, fontSize * 0.06) : Math.max(0.35, fontSize * 0.035),
  };
}

/**
 * @param {{
 *   width: number;
 *   height: number;
 *   baseCellSize: number;
 *   scale: number;
 *   devicePixelRatio: number;
 *   isIOSWebKit: boolean;
 *   layerCount?: number;
 * }} input
 */
export function getSafeRenderMetricsBudget({
  width,
  height,
  baseCellSize,
  scale,
  devicePixelRatio,
  isIOSWebKit,
  layerCount = 1,
}) {
  const MIN_SCALE = 0.2;
  const MAX_INTERNAL_RENDER_SCALE = isIOSWebKit ? 1.8 : 2.4;
  const SAFE_MAX_CANVAS_DIMENSION = isIOSWebKit ? 4096 : 12288;
  const SAFE_MAX_CANVAS_AREA = isIOSWebKit ? 24000000 : 48000000;
  const MIN_INTERNAL_DPR = isIOSWebKit ? 0.4 : 0.5;
  const effectiveLayerCount = Math.max(1, layerCount);
  const perCanvasSafeArea = SAFE_MAX_CANVAS_AREA / effectiveLayerCount;
  const requestedRenderScale = Math.min(scale, MAX_INTERNAL_RENDER_SCALE);
  let renderScale = requestedRenderScale;
  const visualCellSize = baseCellSize * scale;
  const visualCanvasWidth = width * visualCellSize;
  const visualCanvasHeight = height * visualCellSize;
  const renderCanvasWidth = width * baseCellSize * renderScale;
  const renderCanvasHeight = height * baseCellSize * renderScale;

  let dpr = Math.max(1, devicePixelRatio || 1);
  const maxDimension = Math.max(renderCanvasWidth, renderCanvasHeight);
  if (maxDimension * dpr > SAFE_MAX_CANVAS_DIMENSION) {
    dpr = Math.min(dpr, SAFE_MAX_CANVAS_DIMENSION / Math.max(1, maxDimension));
  }
  const estimatedArea = renderCanvasWidth * renderCanvasHeight * dpr * dpr;
  if (estimatedArea > perCanvasSafeArea) {
    dpr = Math.min(
      dpr,
      Math.sqrt(
        perCanvasSafeArea /
          Math.max(1, renderCanvasWidth * renderCanvasHeight),
      ),
    );
  }
  dpr = Math.max(MIN_INTERNAL_DPR, dpr);

  const maxSafeRenderScaleByDimension =
    SAFE_MAX_CANVAS_DIMENSION /
    Math.max(1, Math.max(width, height) * baseCellSize * dpr);
  const maxSafeRenderScaleByArea = Math.sqrt(
    perCanvasSafeArea /
      Math.max(1, width * height * baseCellSize * baseCellSize * dpr * dpr),
  );
  renderScale = Math.max(
    MIN_SCALE,
    Math.min(
      renderScale,
      maxSafeRenderScaleByDimension,
      maxSafeRenderScaleByArea,
    ),
  );

  const safeRenderCellSize = baseCellSize * renderScale;
  const safeRenderCanvasWidth = width * safeRenderCellSize;
  const safeRenderCanvasHeight = height * safeRenderCellSize;

  return {
    dpr,
    renderScale,
    visualCellSize,
    safeRenderCellSize,
    safeRenderCanvasWidth,
    safeRenderCanvasHeight,
    displayScale: Math.max(1, scale / Math.max(renderScale, 0.0001)),
    visualCanvasWidth,
    visualCanvasHeight,
  };
}

/**
 * @param {{
 *   isSingleBoardMobile: boolean;
 *   scale: number;
 *   fitScale: number | null;
 *   hasNeighborBoard: boolean;
 * }} input
 */
export function getSingleBoardSwipeStatus({
  isSingleBoardMobile,
  scale,
  fitScale,
  hasNeighborBoard,
}) {
  const swipeThresholdScale = Number(
    Math.max(0, (fitScale || 0) * 1.05).toFixed(4),
  );

  if (!isSingleBoardMobile || !fitScale) {
    return {
      state: "swipe_locked",
      swipeThresholdScale,
    };
  }

  if (scale > swipeThresholdScale) {
    return {
      state: "swipe_locked",
      swipeThresholdScale,
    };
  }

  return {
    state: hasNeighborBoard ? "swipe_edge_ready" : "swipe_ready",
    swipeThresholdScale,
  };
}

export const SINGLE_BOARD_MOBILE_TOP_CHROME_BASE_OFFSET = 46;

/**
 * @param {{
 *   isSingleBoardMobile: boolean;
 *   summaryHeight: number;
 *   toolbarHeight: number;
 *   swipeStatusHeight: number;
 * }} input
 */
export function getSingleBoardMobileTopChromeOffset({
  isSingleBoardMobile,
  summaryHeight,
  toolbarHeight,
  swipeStatusHeight,
}) {
  if (!isSingleBoardMobile) {
    return null;
  }

  return (
    SINGLE_BOARD_MOBILE_TOP_CHROME_BASE_OFFSET +
    summaryHeight +
    toolbarHeight +
    swipeStatusHeight
  );
}

/**
 * @param {{
 *   viewMode: string;
 *   isSingleBoardMobile: boolean;
 *   baseOffset: number;
 *   pageChromeOffset: number;
 * }} input
 */
export function getSingleBoardCanvasWrapperTopOffset({
  viewMode,
  isSingleBoardMobile,
  baseOffset,
  pageChromeOffset,
}) {
  if (viewMode === "singleBoard" && isSingleBoardMobile) {
    return baseOffset;
  }

  return pageChromeOffset;
}

/**
 * @param {{
 *   isSingleBoardMobile: boolean;
 *   hasInteractedWithCanvas: boolean;
 * }} input
 */
export function getSingleBoardMobileToolbarState({
  isSingleBoardMobile,
  hasInteractedWithCanvas,
}) {
  return {
    collapsed: Boolean(isSingleBoardMobile && hasInteractedWithCanvas),
  };
}

/**
 * @param {string | null} raw
 */
export function parseSingleBoardOnboardingState(raw) {
  if (!raw) {
    return { seen: false, completed: false };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      seen: !!parsed?.seen,
      completed: !!parsed?.completed,
    };
  } catch {
    return { seen: false, completed: false };
  }
}

export function buildCompletedSingleBoardOnboardingState() {
  return {
    seen: true,
    completed: true,
  };
}

/**
 * @param {{
 *   isSingleBoardMobile: boolean;
 *   hasActiveBoardRect: boolean;
 * }} input
 */
export function shouldShowSingleBoardMobileOverviewButton({
  isSingleBoardMobile,
  hasActiveBoardRect,
}) {
  return Boolean(isSingleBoardMobile && hasActiveBoardRect);
}

/**
 * @param {{
 *   requestedWidth: number;
 *   minWidth: number;
 *   maxWidth: number;
 * }} input
 */
export function clampSingleBoardMobileOverviewWidth({
  requestedWidth,
  minWidth,
  maxWidth,
}) {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(requestedWidth)));
}

/**
 * @param {{
 *   viewportWidth: number;
 *   viewportHeight: number;
 *   offsetX?: number;
 *   offsetY?: number;
 *   widthOverride?: number;
 * }} input
 */
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
  const minLeft = sideMargin;
  const maxLeft = Math.max(minLeft, viewportWidth - width - sideMargin);
  const minTop = topReserved;
  const maxTop = Math.max(minTop, viewportHeight - bottomReserved - maxHeight);
  const baseLeft = Math.round((viewportWidth - width) / 2);
  const baseTop = Math.round(topReserved + (maxTop - minTop) / 2);
  const left = Math.min(maxLeft, Math.max(minLeft, baseLeft + offsetX));
  const top = Math.min(maxTop, Math.max(minTop, baseTop + offsetY));

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

/**
 * @param {{
 *   activeBoardNumber: number;
 *   totalBoardCount: number;
 * }} input
 */
export function getSingleBoardOverviewTitle({
  activeBoardNumber,
  totalBoardCount,
}) {
  const currentValue = Number(activeBoardNumber);
  const totalValue = Number(totalBoardCount);
  const current = Number.isFinite(currentValue) && currentValue > 0 ? Math.floor(currentValue) : 1;
  const total = Number.isFinite(totalValue) && totalValue > 0 ? Math.floor(totalValue) : 1;
  return `整图总览 · 当前板 ${current}/${total}`;
}

/**
 * @param {{
 *   nextOffsetX: number;
 *   nextOffsetY: number;
 *   baseLeft: number;
 *   baseTop: number;
 *   minLeft: number;
 *   maxLeft: number;
 *   minTop: number;
 *   maxTop: number;
 * }} input
 */
export function clampSingleBoardMobileOverviewOffset({
  nextOffsetX,
  nextOffsetY,
  baseLeft,
  baseTop,
  minLeft,
  maxLeft,
  minTop,
  maxTop,
}) {
  const clampedLeft = Math.min(maxLeft, Math.max(minLeft, baseLeft + nextOffsetX));
  const clampedTop = Math.min(maxTop, Math.max(minTop, baseTop + nextOffsetY));
  return {
    offsetX: clampedLeft - baseLeft,
    offsetY: clampedTop - baseTop,
  };
}

/**
 * @param {{
 *   activeBoardNumber: number;
 *   boardCols: number;
 *   boardRows: number;
 *   direction: "left" | "right" | "up" | "down";
 * }} input
 */
export function getNeighborBoardNumber({
  activeBoardNumber,
  boardCols,
  boardRows,
  direction,
}) {
  if (activeBoardNumber < 1 || boardCols <= 0 || boardRows <= 0) {
    return null;
  }
  const index = activeBoardNumber - 1;
  const row = Math.floor(index / boardCols);
  const col = index % boardCols;
  const next =
    direction === "left"
      ? { row, col: col - 1 }
      : direction === "right"
        ? { row, col: col + 1 }
        : direction === "up"
          ? { row: row - 1, col }
          : { row: row + 1, col };

  if (
    next.row < 0 ||
    next.col < 0 ||
    next.row >= boardRows ||
    next.col >= boardCols
  ) {
    return null;
  }

  return next.row * boardCols + next.col + 1;
}

/**
 * @param {{
 *   scale: number;
 *   fitScale: number;
 *   translationAtEdge: boolean;
 *   deltaX: number;
 *   deltaY: number;
 *   elapsedMs: number;
 * }} input
 */
export function resolveSingleBoardSwipeDirection({
  scale,
  fitScale,
  translationAtEdge,
  deltaX,
  deltaY,
  elapsedMs,
}) {
  if (!translationAtEdge) return null;
  if (scale > fitScale * 1.05) return null;

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const mainAxis = absX >= absY ? "x" : "y";
  const mainDistance = mainAxis === "x" ? absX : absY;
  const secondaryDistance = mainAxis === "x" ? absY : absX;
  const velocity = mainDistance / Math.max(elapsedMs, 1);

  if (secondaryDistance > mainDistance * 0.55) return null;
  if (mainDistance < 48) return null;
  if (mainDistance < 72 && velocity < 0.28) return null;

  if (mainAxis === "x") {
    return { direction: deltaX < 0 ? "right" : "left" };
  }

  return { direction: deltaY < 0 ? "down" : "up" };
}
