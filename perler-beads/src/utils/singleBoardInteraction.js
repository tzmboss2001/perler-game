/**
 * @param {{ fitScale: number; baseMinScale: number }} input
 */
export function getSingleBoardMinScale({ fitScale, baseMinScale }) {
  return Number(Math.max(baseMinScale, fitScale * 0.45).toFixed(4));
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
 *   viewportWidth: number;
 *   viewportHeight: number;
 *   offsetX?: number;
 *   offsetY?: number;
 * }} input
 */
export function getSingleBoardMobileOverviewLayout({
  viewportWidth,
  viewportHeight,
  offsetX = 0,
  offsetY = 0,
}) {
  const sideMargin = 16;
  const topReserved = 108;
  const bottomReserved = 108;
  const width = Math.max(
    176,
    Math.min(220, Math.round(viewportWidth - sideMargin * 2)),
  );
  const maxHeight = Math.max(
    180,
    Math.min(280, Math.round(viewportHeight - topReserved - bottomReserved)),
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
  const current = Math.max(1, Number(activeBoardNumber || 1));
  const total = Math.max(1, Number(totalBoardCount || 1));
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
