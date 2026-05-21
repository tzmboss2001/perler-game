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

const normalizeProjectId = (projectId) =>
  projectId === undefined || projectId === null ? "anonymous" : String(projectId);

const getBeadColorId = (bead) => {
  if (!bead) {
    return "-";
  }

  if (typeof bead === "string" || typeof bead === "number") {
    return String(bead);
  }

  return String(bead.id || bead.colorId || bead.code || "-");
};

const fnv1a32 = (text) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

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

export const createPhotoProgressConfirmationModel = ({
  preview,
  minConfidence = 0.75,
}) => {
  const cells = Array.isArray(preview?.cells) ? preview.cells : [];
  const selectableCells = cells.filter(
    (cell) =>
      cell.state === "done_candidate" &&
      Number(cell.confidence || 0) >= minConfidence,
  );

  return {
    boardNumber: preview?.boardNumber || 0,
    doneCandidateCount: countByState(cells, "done_candidate"),
    selectableCellIndexes: selectableCells.map((cell) => cell.index),
    defaultSelectedCellIndexes: selectableCells.map((cell) => cell.index),
    canSaveDefaultSelection: selectableCells.length > 0,
    blockedCounts: {
      suspectedWrong: countByState(cells, "suspected_wrong"),
      lowConfidence: countByState(cells, "low_confidence"),
      pending: countByState(cells, "pending"),
    },
  };
};

export const createPhotoProgressStorageKey = ({ projectId, beadDataHash }) =>
  `photo-progress:v1:${normalizeProjectId(projectId)}:${beadDataHash}`;

export const createPhotoProgressBeadDataHash = (beadData) => {
  const width = Number(beadData?.width || 0);
  const height = Number(beadData?.height || 0);
  const beads = Array.isArray(beadData?.beads) ? beadData.beads : [];
  const colorIds = beads.map(getBeadColorId).join(",");
  const raw = `${width}x${height}|${colorIds}`;

  return `v1_${fnv1a32(raw).toString(16).padStart(8, "0")}`;
};

const canUseStorage = (storage, methodName) =>
  Boolean(storage && typeof storage[methodName] === "function");

const hasConfirmedCells = (snapshot) =>
  Boolean(
    snapshot &&
      snapshot.completedCount > 0 &&
      Array.isArray(snapshot.confirmedCells) &&
      snapshot.confirmedCells.length > 0,
  );

const createPersistedSnapshot = ({
  projectId,
  beadDataHash,
  snapshot,
  savedAt,
}) => ({
  ...snapshot,
  projectId: normalizeProjectId(projectId),
  beadDataHash,
  savedAt,
});

export const savePhotoProgressSnapshot = ({
  storage,
  projectId,
  beadDataHash,
  snapshot,
  savedAt,
}) => {
  const key = createPhotoProgressStorageKey({ projectId, beadDataHash });

  if (!canUseStorage(storage, "setItem")) {
    return {
      ok: false,
      key,
      reason: "storage_unavailable",
      message: "本地保存不可用，请稍后重试",
    };
  }

  if (!hasConfirmedCells(snapshot)) {
    return {
      ok: false,
      key,
      reason: "empty_confirmed_cells",
      message: "没有可保存的确认完成格",
    };
  }

  const persistedSnapshot = createPersistedSnapshot({
    projectId,
    beadDataHash,
    snapshot,
    savedAt,
  });

  try {
    storage.setItem(key, JSON.stringify(persistedSnapshot));
    return {
      ok: true,
      key,
      snapshot: persistedSnapshot,
    };
  } catch (error) {
    return {
      ok: false,
      key,
      reason: "save_failed",
      message: "保存失败，请释放浏览器空间后重试",
      error,
    };
  }
};

export const readPhotoProgressSnapshot = ({
  storage,
  projectId,
  beadDataHash,
}) => {
  const key = createPhotoProgressStorageKey({ projectId, beadDataHash });

  if (!canUseStorage(storage, "getItem")) {
    return {
      status: "missing",
      key,
      snapshot: null,
    };
  }

  const rawSnapshot = storage.getItem(key);

  if (!rawSnapshot) {
    return {
      status: "missing",
      key,
      snapshot: null,
    };
  }

  let snapshot;
  try {
    snapshot = JSON.parse(rawSnapshot);
  } catch (error) {
    return {
      status: "invalid",
      key,
      snapshot: null,
      error,
    };
  }

  if (snapshot.beadDataHash !== beadDataHash) {
    return {
      status: "hash_mismatch",
      key,
      snapshot: null,
    };
  }

  if (snapshot.projectId !== normalizeProjectId(projectId)) {
    return {
      status: "project_mismatch",
      key,
      snapshot: null,
    };
  }

  return {
    status: "restored",
    key,
    snapshot,
  };
};

export const clearPhotoProgressSnapshot = ({
  storage,
  projectId,
  beadDataHash,
}) => {
  const key = createPhotoProgressStorageKey({ projectId, beadDataHash });

  if (!canUseStorage(storage, "removeItem")) {
    return {
      ok: false,
      key,
      reason: "storage_unavailable",
      message: "本地保存不可用，请稍后重试",
    };
  }

  try {
    storage.removeItem(key);
    return {
      ok: true,
      key,
    };
  } catch (error) {
    return {
      ok: false,
      key,
      reason: "clear_failed",
      message: "清除失败，请稍后重试",
      error,
    };
  }
};
