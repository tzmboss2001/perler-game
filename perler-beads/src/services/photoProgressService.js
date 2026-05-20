const DONE_DISTANCE_THRESHOLD = 70;

const normalizeQuality = ({ quality, hasEmptyReference }) => {
  const baseQuality = quality || {
    level: "poor",
    brightness: 0,
    tint: 0,
    glareRatio: 0,
    issues: [],
  };
  const issues = [...(baseQuality.issues || [])];

  if (!hasEmptyReference) {
    issues.push("missing_empty_reference");
  }

  return {
    ...baseQuality,
    level: !hasEmptyReference ? "poor" : baseQuality.level,
    issues,
  };
};

const getPreviewState = ({ cell, qualityLevel }) => {
  if (cell.state === "wrong") {
    return "suspected_wrong";
  }

  if (cell.state === "missing" || cell.state === "empty") {
    return "pending";
  }

  if (cell.state === "matched") {
    if (qualityLevel === "poor") {
      return "low_confidence";
    }

    return cell.detectedDistance !== null &&
      cell.detectedDistance <= DONE_DISTANCE_THRESHOLD
      ? "done_candidate"
      : "low_confidence";
  }

  return "low_confidence";
};

const getConfidenceForState = ({ state, qualityLevel }) => {
  if (state === "done_candidate") {
    return qualityLevel === "good" ? 0.9 : 0.75;
  }

  if (state === "suspected_wrong") {
    return 0.7;
  }

  if (state === "low_confidence") {
    return 0.35;
  }

  return 0.5;
};

const getConfidenceReasons = ({ cell, quality }) => {
  const reasons = [...(quality.issues || [])];

  if (quality.level === "poor") {
    reasons.push("quality_poor");
  }

  if (quality.glareRatio >= 0.12) {
    reasons.push("glare");
  }

  if (
    cell.detectedDistance !== null &&
    cell.detectedDistance > DONE_DISTANCE_THRESHOLD
  ) {
    reasons.push("color_distance_high");
  }

  return Array.from(new Set(reasons));
};

const countByState = (cells, state) =>
  cells.filter((cell) => cell.state === state).length;

export const createPhotoProgressPreview = ({
  boardNumber,
  boardSize,
  usedWidth,
  usedHeight,
  detection,
  hasEmptyReference = true,
  createdAt,
}) => {
  const quality = normalizeQuality({
    quality: detection.quality,
    hasEmptyReference,
  });

  const cells = (detection.detectedCells || [])
    .filter((cell) => Boolean(cell.target))
    .map((cell) => {
      const state = getPreviewState({ cell, qualityLevel: quality.level });

      return {
        x: cell.x,
        y: cell.y,
        index: cell.index,
        state,
        confidence: getConfidenceForState({ state, qualityLevel: quality.level }),
        targetColorId: cell.target?.id || null,
        detectedColorId: cell.detectedColor?.id || null,
        confidenceReasons: getConfidenceReasons({ cell, quality }),
      };
    });

  return {
    version: 1,
    boardNumber,
    boardSize,
    usedWidth,
    usedHeight,
    source: "photo_upload",
    createdAt,
    qualityLevel: quality.level,
    qualityIssues: quality.issues,
    cells,
    summary: {
      doneCandidateCount: countByState(cells, "done_candidate"),
      suspectedWrongCount: countByState(cells, "suspected_wrong"),
      lowConfidenceCount: countByState(cells, "low_confidence"),
      pendingCount: countByState(cells, "pending"),
    },
  };
};

export const confirmPhotoProgressPreview = ({
  preview,
  confirmedCellIndexes,
  confirmedAt,
}) => {
  const confirmedSet = new Set(confirmedCellIndexes);
  const confirmedCells = preview.cells
    .filter(
      (cell) =>
        cell.state === "done_candidate" && confirmedSet.has(cell.index),
    )
    .map((cell) => ({
      x: cell.x,
      y: cell.y,
      index: cell.index,
      targetColorId: cell.targetColorId,
      confidence: cell.confidence,
      confirmedAt,
      source: "photo_upload",
    }));

  return {
    version: 1,
    boardNumber: preview.boardNumber,
    boardSize: preview.boardSize,
    usedWidth: preview.usedWidth,
    usedHeight: preview.usedHeight,
    source: "photo_upload",
    createdAt: preview.createdAt,
    confirmedAt,
    qualityLevel: preview.qualityLevel,
    completedCount: confirmedCells.length,
    suspectedWrongCount: preview.summary.suspectedWrongCount,
    lowConfidenceCount: preview.summary.lowConfidenceCount,
    confirmedCells,
  };
};

export const createPhotoProgressStorageKey = ({ projectId, beadDataHash }) =>
  `photo-progress:v1:${projectId}:${beadDataHash}`;
