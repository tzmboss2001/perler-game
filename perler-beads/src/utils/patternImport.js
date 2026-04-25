export const clampPatternGridSize = (value) => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(512, Math.max(1, Math.round(value)));
};

const COMMON_GRID_CANDIDATES = [
  { rows: 58, cols: 58, priority: 0 },
  { rows: 29, cols: 29, priority: 1 },
  { rows: 116, cols: 116, priority: 2 },
  { rows: 58, cols: 104, priority: 0 },
  { rows: 104, cols: 208, priority: 1 },
  { rows: 29, cols: 58, priority: 2 },
  { rows: 104, cols: 58, priority: 1 },
  { rows: 208, cols: 104, priority: 2 },
  { rows: 58, cols: 208, priority: 3 },
  { rows: 208, cols: 58, priority: 3 },
];

export const guessPatternGridCandidates = ({ imageWidth, imageHeight, maxResults = 4 }) => {
  const safeWidth = Math.max(1, Number(imageWidth) || 1);
  const safeHeight = Math.max(1, Number(imageHeight) || 1);
  const imageAspect = safeWidth / safeHeight;

  const scored = COMMON_GRID_CANDIDATES.map((candidate) => {
    const candidateAspect = candidate.cols / candidate.rows;
    const aspectPenalty = Math.abs(Math.log(candidateAspect / imageAspect));
    const squarePenalty = Math.abs(candidate.rows - candidate.cols) < 1 && Math.abs(imageAspect - 1) < 0.12 ? 0 : 0.05;

    return {
      rows: candidate.rows,
      cols: candidate.cols,
      score: aspectPenalty + candidate.priority * 0.06 + squarePenalty,
    };
  });

  return scored
    .sort((left, right) => left.score - right.score)
    .slice(0, maxResults)
    .map(({ rows, cols }) => ({ rows, cols }));
};

export const classifyPatternCellConfidence = ({ varianceScore, matchDistance, sampleCount }) => {
  const safeVariance = Number(varianceScore) || 0;
  const safeDistance = Number(matchDistance) || 0;
  const safeSamples = Number(sampleCount) || 0;

  if (safeSamples < 9) {
    return { isLowConfidence: true, score: 1, reason: 'too-few-samples' };
  }

  if (safeVariance >= 26 && safeDistance >= 22) {
    return { isLowConfidence: true, score: 0.98, reason: 'variance-and-distance' };
  }

  if (safeVariance >= 30) {
    return { isLowConfidence: true, score: 0.9, reason: 'variance' };
  }

  if (safeDistance >= 26) {
    return { isLowConfidence: true, score: 0.88, reason: 'distance' };
  }

  return { isLowConfidence: false, score: 0.18, reason: 'ok' };
};

export const summarizeLowConfidenceCells = (cells) => {
  const safeCells = Array.isArray(cells) ? cells : [];
  return {
    count: safeCells.length,
    preview: safeCells
      .slice(0, 3)
      .map((cell) => `${cell.row + 1}行${cell.col + 1}列`)
      .join('、'),
  };
};

export const collectLowConfidenceIndices = (cells, width, height) => {
  const safeCells = Array.isArray(cells) ? cells : [];
  const safeWidth = Math.max(1, Number(width) || 0);
  const safeHeight = Math.max(1, Number(height) || 0);
  const seen = new Set();
  const indices = [];

  safeCells.forEach((cell) => {
    const row = Number(cell?.row);
    const col = Number(cell?.col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return;
    }
    if (row < 0 || col < 0 || row >= safeHeight || col >= safeWidth) {
      return;
    }
    const index = row * safeWidth + col;
    if (seen.has(index)) {
      return;
    }
    seen.add(index);
    indices.push(index);
  });

  return indices;
};

export const getNextLowConfidenceReviewIndex = (indices, currentIndex, direction = 1) => {
  const safeIndices = Array.isArray(indices) ? indices.filter(Number.isInteger) : [];
  if (safeIndices.length === 0) {
    return null;
  }

  const step = direction < 0 ? -1 : 1;
  if (!Number.isInteger(currentIndex)) {
    return step > 0 ? safeIndices[0] : safeIndices[safeIndices.length - 1];
  }

  const currentPosition = safeIndices.indexOf(currentIndex);
  if (currentPosition === -1) {
    return step > 0 ? safeIndices[0] : safeIndices[safeIndices.length - 1];
  }

  const nextPosition = (currentPosition + step + safeIndices.length) % safeIndices.length;
  return safeIndices[nextPosition];
};

export const mergeImportReviewDraftFields = (previousDraft, nextDraft) => {
  const safeDraft = nextDraft && typeof nextDraft === 'object' ? { ...nextDraft } : {};
  if (previousDraft?.importSource !== 'external-pattern-import') {
    return safeDraft;
  }

  return {
    ...safeDraft,
    importSource: 'external-pattern-import',
    lowConfidenceCells: Array.isArray(previousDraft.lowConfidenceCells)
      ? previousDraft.lowConfidenceCells.map((cell) => ({ ...cell }))
      : [],
  };
};
