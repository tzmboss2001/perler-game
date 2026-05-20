import { BeadColor } from "../data/beadColors";
import { BeadPixelData } from "./colorMatchService";

export interface VisionPoint {
  x: number;
  y: number;
}

export type VisionRgb = [number, number, number];

export interface VisionBoardTile {
  index: number;
  label: string;
  startX: number;
  startY: number;
  boardSize: number;
  usedWidth: number;
  usedHeight: number;
  beads: (BeadColor | null)[];
}

export type VisionCellState =
  | "matched"
  | "missing"
  | "wrong"
  | "empty"
  | "extra";

export interface VisionDetectedCell {
  index: number;
  x: number;
  y: number;
  center: VisionPoint;
  target: BeadColor | null;
  sample: VisionRgb;
  state: VisionCellState;
  detectedColor: BeadColor | null;
  detectedDistance: number | null;
}

export interface VisionColorProgress {
  color: BeadColor;
  total: number;
  matched: number;
  remaining: number;
  wrong: number;
}

export interface VisionDetectionQuality {
  level: "good" | "warning" | "poor";
  brightness: number;
  tint: number;
  glareRatio: number;
  issues: string[];
}

export interface VisionWrongColorSuggestion {
  sourceColor: BeadColor | null;
  targetColor: BeadColor | null;
  count: number;
}

export interface VisionDetectionResult {
  totalTargetCells: number;
  matchedCells: number;
  missingCells: number;
  wrongCells: number;
  extraFilledCells: number;
  progress: number;
  activeColorId: string | null;
  activeColorMatched: number;
  activeColorRemaining: number;
  colors: VisionColorProgress[];
  guideCells: VisionDetectedCell[];
  matchedGuideCells: VisionDetectedCell[];
  wrongGuideCells: VisionDetectedCell[];
  wrongCellsDetail: VisionDetectedCell[];
  detectedCells: VisionDetectedCell[];
  wrongColorSuggestions: VisionWrongColorSuggestion[];
  quality: VisionDetectionQuality;
  markerRadius: number;
}

interface DetectVisionBoardOptions {
  frameData: Uint8ClampedArray;
  frameWidth: number;
  frameHeight: number;
  boardSize?: number;
  usedWidth?: number;
  usedHeight?: number;
}

export type VisionCornerDetectFailureReason =
  | "no_edges"
  | "board_too_small"
  | "board_too_large";

export interface VisionCornerDetectConfidence {
  level: "high" | "medium" | "low";
  score: number;
}

export interface VisionCornerDetectResult {
  corners: [VisionPoint, VisionPoint, VisionPoint, VisionPoint] | null;
  reason: VisionCornerDetectFailureReason | null;
  confidence: VisionCornerDetectConfidence | null;
}

interface AnalyzeVisionProgressOptions {
  frameData: Uint8ClampedArray;
  frameWidth: number;
  frameHeight: number;
  boardTile: VisionBoardTile;
  corners: [VisionPoint, VisionPoint, VisionPoint, VisionPoint];
  emptyReferenceRgb: VisionRgb;
  tolerance: number;
  preferredColorId?: string | null;
}

interface FindBestBoardMatchOptions {
  frameData: Uint8ClampedArray;
  frameWidth: number;
  frameHeight: number;
  boardTiles: VisionBoardTile[];
  corners: [VisionPoint, VisionPoint, VisionPoint, VisionPoint];
  emptyReferenceRgb: VisionRgb;
  tolerance: number;
  preferredColorId?: string | null;
}

export interface VisionBoardMatchResult {
  tile: VisionBoardTile;
  detection: VisionDetectionResult;
  score: number;
}

export const calculateVisionBoardMatchScore = (
  detection: VisionDetectionResult,
) =>
  detection.matchedCells * 6 +
  detection.progress * 240 -
  detection.wrongCells * 8 -
  detection.extraFilledCells * 5 -
  detection.missingCells * 0.2;

interface VisionSampleAnalysis {
  rgb: VisionRgb;
  glareRatio: number;
}

export interface VisionFrameSignature {
  values: number[];
  sampleCols: number;
  sampleRows: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, ratio: number) =>
  start + (end - start) * ratio;

const distance = (a: VisionPoint, b: VisionPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const rgbDistance = (a: VisionRgb, b: VisionRgb) =>
  Math.sqrt(
    (a[0] - b[0]) * (a[0] - b[0]) +
      (a[1] - b[1]) * (a[1] - b[1]) +
      (a[2] - b[2]) * (a[2] - b[2]),
  );

export const rgbToCss = (rgb: VisionRgb) =>
  `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

const hexToRgb = (hex: string): VisionRgb => {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) {
    return [0, 0, 0];
  }

  return [
    parseInt(normalized.slice(0, 2), 16) || 0,
    parseInt(normalized.slice(2, 4), 16) || 0,
    parseInt(normalized.slice(4, 6), 16) || 0,
  ];
};

const getBeadRgb = (bead: BeadColor): VisionRgb => {
  if (
    Array.isArray(bead.rgb) &&
    bead.rgb.length === 3 &&
    bead.rgb.every((value) => Number.isFinite(value))
  ) {
    return bead.rgb as VisionRgb;
  }
  return hexToRgb(bead.hex || "#000000");
};

const findClosestBeadColor = (
  sample: VisionRgb,
  candidates: BeadColor[],
): { color: BeadColor; distance: number } | null => {
  let best: { color: BeadColor; distance: number } | null = null;

  for (const bead of candidates) {
    const nextDistance = rgbDistance(sample, getBeadRgb(bead));
    if (!best || nextDistance < best.distance) {
      best = { color: bead, distance: nextDistance };
    }
  }

  return best;
};

const smoothSeries = (values: number[], radius: number) =>
  values.map((_, index) => {
    let total = 0;
    let count = 0;
    for (let offset = -radius; offset <= radius; offset++) {
      const nextIndex = index + offset;
      if (nextIndex < 0 || nextIndex >= values.length) {
        continue;
      }
      total += values[nextIndex];
      count += 1;
    }
    return count ? total / count : 0;
  });

const getRgbAt = (
  frameData: Uint8ClampedArray,
  frameWidth: number,
  frameHeight: number,
  x: number,
  y: number,
): VisionRgb => {
  const px = clamp(Math.round(x), 0, frameWidth - 1);
  const py = clamp(Math.round(y), 0, frameHeight - 1);
  const offset = (py * frameWidth + px) * 4;
  return [frameData[offset], frameData[offset + 1], frameData[offset + 2]];
};

const rgbToGray = (rgb: VisionRgb) =>
  rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;

const getRgbAverage = (rgb: VisionRgb) => (rgb[0] + rgb[1] + rgb[2]) / 3;

const getRgbTint = (rgb: VisionRgb) => {
  const average = getRgbAverage(rgb);
  return Math.max(
    Math.abs(rgb[0] - average),
    Math.abs(rgb[1] - average),
    Math.abs(rgb[2] - average),
  );
};

const normalizeSampleByEmptyReference = (
  sample: VisionRgb,
  emptyReferenceRgb: VisionRgb,
): VisionRgb => {
  const referenceAverage = Math.max(1, getRgbAverage(emptyReferenceRgb));
  const luminanceScale = clamp(210 / referenceAverage, 0.82, 1.42);
  const channelScales: VisionRgb = [
    referenceAverage / Math.max(1, emptyReferenceRgb[0]),
    referenceAverage / Math.max(1, emptyReferenceRgb[1]),
    referenceAverage / Math.max(1, emptyReferenceRgb[2]),
  ];

  return [
    clamp(Math.round(sample[0] * channelScales[0] * luminanceScale), 0, 255),
    clamp(Math.round(sample[1] * channelScales[1] * luminanceScale), 0, 255),
    clamp(Math.round(sample[2] * channelScales[2] * luminanceScale), 0, 255),
  ];
};

const evaluateVisionQuality = (emptyReferenceRgb: VisionRgb): VisionDetectionQuality => {
  const brightness = Math.round(getRgbAverage(emptyReferenceRgb));
  const tint = Math.round(getRgbTint(emptyReferenceRgb));
  const issues: string[] = [];

  if (brightness < 95) {
    issues.push("画面偏暗");
  } else if (brightness < 125) {
    issues.push("光线略暗");
  }

  if (brightness > 242) {
    issues.push("空板区域过亮，可能有反光");
  } else if (brightness > 228) {
    issues.push("空板区域偏亮");
  }

  if (tint > 34) {
    issues.push("环境偏色明显");
  } else if (tint > 22) {
    issues.push("环境有轻微偏色");
  }

  let level: VisionDetectionQuality["level"] = "good";
  if (brightness < 95 || brightness > 242 || tint > 34) {
    level = "poor";
  } else if (issues.length > 0) {
    level = "warning";
  }

  return {
    level,
    brightness,
    tint,
    glareRatio: 0,
    issues,
  };
};

export const createVisionFrameSignature = ({
  frameData,
  frameWidth,
  frameHeight,
  corners,
  sampleCols = 18,
  sampleRows = 18,
}: {
  frameData: Uint8ClampedArray;
  frameWidth: number;
  frameHeight: number;
  corners?: [VisionPoint, VisionPoint, VisionPoint, VisionPoint] | null;
  sampleCols?: number;
  sampleRows?: number;
}): VisionFrameSignature => {
  const minX = corners
    ? Math.max(0, Math.min(...corners.map((point) => point.x)))
    : 0;
  const maxX = corners
    ? Math.min(frameWidth - 1, Math.max(...corners.map((point) => point.x)))
    : frameWidth - 1;
  const minY = corners
    ? Math.max(0, Math.min(...corners.map((point) => point.y)))
    : 0;
  const maxY = corners
    ? Math.min(frameHeight - 1, Math.max(...corners.map((point) => point.y)))
    : frameHeight - 1;

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const values: number[] = [];

  for (let row = 0; row < sampleRows; row++) {
    for (let col = 0; col < sampleCols; col++) {
      const x = minX + ((col + 0.5) / sampleCols) * width;
      const y = minY + ((row + 0.5) / sampleRows) * height;
      values.push(rgbToGray(getRgbAt(frameData, frameWidth, frameHeight, x, y)));
    }
  }

  return {
    values,
    sampleCols,
    sampleRows,
  };
};

export const compareVisionFrameSignature = (
  previous: VisionFrameSignature,
  next: VisionFrameSignature,
) => {
  const length = Math.min(previous.values.length, next.values.length);
  if (length === 0) {
    return 0;
  }

  let totalDiff = 0;
  for (let index = 0; index < length; index++) {
    totalDiff += Math.abs(previous.values[index] - next.values[index]);
  }

  return totalDiff / length;
};

const getSeriesBounds = (series: number[]) => {
  const average =
    series.reduce((total, value) => total + value, 0) / Math.max(series.length, 1);
  const peak = Math.max(...series, 0);
  const threshold = Math.max(average * 1.2, peak * 0.42);

  let start = 0;
  while (start < series.length && series[start] < threshold) {
    start += 1;
  }

  let end = series.length - 1;
  while (end >= 0 && series[end] < threshold) {
    end -= 1;
  }

  if (start >= end) {
    return null;
  }

  return { start, end, average, threshold };
};

const getAxisSamples = (
  start: number,
  end: number,
  count: number,
) => {
  if (count <= 1) {
    return [Math.round((start + end) / 2)];
  }

  return new Array(count).fill(0).map((_, index) =>
    Math.round(start + ((end - start) * index) / (count - 1)),
  );
};

const scoreVerticalEdge = ({
  frameData,
  frameWidth,
  frameHeight,
  borderReference,
  x,
  top,
  bottom,
  offset,
  direction,
}: {
  frameData: Uint8ClampedArray;
  frameWidth: number;
  frameHeight: number;
  borderReference: VisionRgb;
  x: number;
  top: number;
  bottom: number;
  offset: number;
  direction: "left" | "right";
}) => {
  const sampleYs = getAxisSamples(
    top + (bottom - top) * 0.12,
    bottom - (bottom - top) * 0.12,
    9,
  );

  let edgeContrast = 0;
  let interiorAdvantage = 0;

  for (const y of sampleYs) {
    const inside = getRgbAt(
      frameData,
      frameWidth,
      frameHeight,
      direction === "left" ? x + offset : x - offset,
      y,
    );
    const outside = getRgbAt(
      frameData,
      frameWidth,
      frameHeight,
      direction === "left" ? x - offset : x + offset,
      y,
    );
    edgeContrast += Math.abs(rgbToGray(inside) - rgbToGray(outside));
    interiorAdvantage +=
      rgbDistance(inside, borderReference) - rgbDistance(outside, borderReference);
  }

  return edgeContrast * 1.18 + interiorAdvantage * 0.95;
};

const scoreHorizontalEdge = ({
  frameData,
  frameWidth,
  frameHeight,
  borderReference,
  y,
  left,
  right,
  offset,
  direction,
}: {
  frameData: Uint8ClampedArray;
  frameWidth: number;
  frameHeight: number;
  borderReference: VisionRgb;
  y: number;
  left: number;
  right: number;
  offset: number;
  direction: "top" | "bottom";
}) => {
  const sampleXs = getAxisSamples(
    left + (right - left) * 0.12,
    right - (right - left) * 0.12,
    9,
  );

  let edgeContrast = 0;
  let interiorAdvantage = 0;

  for (const x of sampleXs) {
    const inside = getRgbAt(
      frameData,
      frameWidth,
      frameHeight,
      x,
      direction === "top" ? y + offset : y - offset,
    );
    const outside = getRgbAt(
      frameData,
      frameWidth,
      frameHeight,
      x,
      direction === "top" ? y - offset : y + offset,
    );
    edgeContrast += Math.abs(rgbToGray(inside) - rgbToGray(outside));
    interiorAdvantage +=
      rgbDistance(inside, borderReference) - rgbDistance(outside, borderReference);
  }

  return edgeContrast * 1.18 + interiorAdvantage * 0.95;
};

const refineRectEdge = ({
  initial,
  min,
  max,
  scorer,
}: {
  initial: number;
  min: number;
  max: number;
  scorer: (candidate: number) => number;
}) => {
  let bestValue = clamp(Math.round(initial), min, max);
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let candidate = min; candidate <= max; candidate += 1) {
    const score = scorer(candidate);
    if (score > bestScore) {
      bestScore = score;
      bestValue = candidate;
    }
  }

  return bestValue;
};

const CORNER_DIRECTION_MAP = {
  topLeft: { insideX: 1, insideY: 1, outsideX: -1, outsideY: -1 },
  topRight: { insideX: -1, insideY: 1, outsideX: 1, outsideY: -1 },
  bottomRight: { insideX: -1, insideY: -1, outsideX: 1, outsideY: 1 },
  bottomLeft: { insideX: 1, insideY: -1, outsideX: -1, outsideY: 1 },
} as const;

const scoreCornerCandidate = ({
  frameData,
  frameWidth,
  frameHeight,
  borderReference,
  point,
  offset,
  corner,
}: {
  frameData: Uint8ClampedArray;
  frameWidth: number;
  frameHeight: number;
  borderReference: VisionRgb;
  point: VisionPoint;
  offset: number;
  corner: keyof typeof CORNER_DIRECTION_MAP;
}) => {
  const direction = CORNER_DIRECTION_MAP[corner];
  const inside = getRgbAt(
    frameData,
    frameWidth,
    frameHeight,
    point.x + direction.insideX * offset,
    point.y + direction.insideY * offset,
  );
  const insideDeep = getRgbAt(
    frameData,
    frameWidth,
    frameHeight,
    point.x + direction.insideX * offset * 1.8,
    point.y + direction.insideY * offset * 1.8,
  );
  const outsideHorizontal = getRgbAt(
    frameData,
    frameWidth,
    frameHeight,
    point.x + direction.outsideX * offset,
    point.y + direction.insideY * offset * 0.35,
  );
  const outsideVertical = getRgbAt(
    frameData,
    frameWidth,
    frameHeight,
    point.x + direction.insideX * offset * 0.35,
    point.y + direction.outsideY * offset,
  );
  const outsideDiagonal = getRgbAt(
    frameData,
    frameWidth,
    frameHeight,
    point.x + direction.outsideX * offset,
    point.y + direction.outsideY * offset,
  );

  const edgeContrast =
    Math.abs(rgbToGray(inside) - rgbToGray(outsideHorizontal)) +
    Math.abs(rgbToGray(inside) - rgbToGray(outsideVertical)) +
    Math.abs(rgbToGray(insideDeep) - rgbToGray(outsideDiagonal)) * 0.82;

  const interiorAdvantage =
    (rgbDistance(inside, borderReference) - rgbDistance(outsideHorizontal, borderReference)) +
    (rgbDistance(inside, borderReference) - rgbDistance(outsideVertical, borderReference)) +
    (rgbDistance(insideDeep, borderReference) - rgbDistance(outsideDiagonal, borderReference)) *
      0.78;

  const insideConsistency =
    80 - rgbDistance(inside, insideDeep);

  return edgeContrast * 1.1 + interiorAdvantage * 1.04 + insideConsistency * 0.18;
};

const refineCornerPoint = ({
  frameData,
  frameWidth,
  frameHeight,
  borderReference,
  initial,
  searchRadiusX,
  searchRadiusY,
  offset,
  corner,
}: {
  frameData: Uint8ClampedArray;
  frameWidth: number;
  frameHeight: number;
  borderReference: VisionRgb;
  initial: VisionPoint;
  searchRadiusX: number;
  searchRadiusY: number;
  offset: number;
  corner: keyof typeof CORNER_DIRECTION_MAP;
}) => {
  let bestPoint = {
    x: clamp(Math.round(initial.x), 0, frameWidth - 1),
    y: clamp(Math.round(initial.y), 0, frameHeight - 1),
  };
  let bestScore = Number.NEGATIVE_INFINITY;

  const minX = clamp(Math.round(initial.x - searchRadiusX), 0, frameWidth - 1);
  const maxX = clamp(Math.round(initial.x + searchRadiusX), 0, frameWidth - 1);
  const minY = clamp(Math.round(initial.y - searchRadiusY), 0, frameHeight - 1);
  const maxY = clamp(Math.round(initial.y + searchRadiusY), 0, frameHeight - 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const cornerScore = scoreCornerCandidate({
        frameData,
        frameWidth,
        frameHeight,
        borderReference,
        point: { x, y },
        offset,
        corner,
      });
      const driftPenalty =
        Math.hypot(x - initial.x, y - initial.y) * 1.05 +
        (Math.abs(x - initial.x) + Math.abs(y - initial.y)) * 0.18;
      const score = cornerScore - driftPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestPoint = { x, y };
      }
    }
  }

  return bestPoint;
};

export const detectBoardCornersDetailed = ({
  frameData,
  frameWidth,
  frameHeight,
  boardSize,
  usedWidth,
  usedHeight,
}: DetectVisionBoardOptions): VisionCornerDetectResult => {
  const step = Math.max(2, Math.floor(Math.min(frameWidth, frameHeight) / 140));
  const sampleCols = Math.max(12, Math.floor(frameWidth / step));
  const sampleRows = Math.max(12, Math.floor(frameHeight / step));

  const borderSamples: VisionRgb[] = [];
  for (let x = 0; x < sampleCols; x++) {
    const px = x * step;
    borderSamples.push(getRgbAt(frameData, frameWidth, frameHeight, px, 0));
    borderSamples.push(
      getRgbAt(frameData, frameWidth, frameHeight, px, frameHeight - 1),
    );
  }
  for (let y = 0; y < sampleRows; y++) {
    const py = y * step;
    borderSamples.push(getRgbAt(frameData, frameWidth, frameHeight, 0, py));
    borderSamples.push(
      getRgbAt(frameData, frameWidth, frameHeight, frameWidth - 1, py),
    );
  }

  const borderReference: VisionRgb = borderSamples.length
    ? [
        Math.round(
          borderSamples.reduce((total, rgb) => total + rgb[0], 0) / borderSamples.length,
        ),
        Math.round(
          borderSamples.reduce((total, rgb) => total + rgb[1], 0) / borderSamples.length,
        ),
        Math.round(
          borderSamples.reduce((total, rgb) => total + rgb[2], 0) / borderSamples.length,
        ),
      ]
    : [0, 0, 0];

  const rowEnergy = new Array(sampleRows).fill(0);
  const colEnergy = new Array(sampleCols).fill(0);

  for (let row = 1; row < sampleRows - 1; row++) {
    for (let col = 1; col < sampleCols - 1; col++) {
      const x = col * step;
      const y = row * step;
      const center = getRgbAt(frameData, frameWidth, frameHeight, x, y);
      const left = getRgbAt(frameData, frameWidth, frameHeight, x - step, y);
      const right = getRgbAt(frameData, frameWidth, frameHeight, x + step, y);
      const top = getRgbAt(frameData, frameWidth, frameHeight, x, y - step);
      const bottom = getRgbAt(frameData, frameWidth, frameHeight, x, y + step);

      const edgeStrength =
        Math.abs(rgbToGray(left) - rgbToGray(right)) +
        Math.abs(rgbToGray(top) - rgbToGray(bottom));
      const borderDiff = rgbDistance(center, borderReference);
      const score = edgeStrength * 0.7 + borderDiff * 0.9;

      rowEnergy[row] += score;
      colEnergy[col] += score;
    }
  }

  const smoothRows = smoothSeries(rowEnergy, 2);
  const smoothCols = smoothSeries(colEnergy, 2);
  const rowBounds = getSeriesBounds(smoothRows);
  const colBounds = getSeriesBounds(smoothCols);
  if (!rowBounds || !colBounds) {
    return {
      corners: null,
      reason: "no_edges",
      confidence: null,
    };
  }

  let expandedRowStart = rowBounds.start;
  let expandedRowEnd = rowBounds.end;
  let expandedColStart = colBounds.start;
  let expandedColEnd = colBounds.end;

  const rowFloor = Math.max(rowBounds.average * 0.78, rowBounds.threshold * 0.34);
  const colFloor = Math.max(colBounds.average * 0.78, colBounds.threshold * 0.34);

  while (expandedRowStart > 1 && smoothRows[expandedRowStart - 1] >= rowFloor) {
    expandedRowStart -= 1;
  }
  while (
    expandedRowEnd < smoothRows.length - 2 &&
    smoothRows[expandedRowEnd + 1] >= rowFloor
  ) {
    expandedRowEnd += 1;
  }
  while (expandedColStart > 1 && smoothCols[expandedColStart - 1] >= colFloor) {
    expandedColStart -= 1;
  }
  while (
    expandedColEnd < smoothCols.length - 2 &&
    smoothCols[expandedColEnd + 1] >= colFloor
  ) {
    expandedColEnd += 1;
  }

  let left = clamp((expandedColStart - 1) * step, 0, frameWidth - 1);
  let right = clamp((expandedColEnd + 1) * step, 0, frameWidth - 1);
  let top = clamp((expandedRowStart - 1) * step, 0, frameHeight - 1);
  let bottom = clamp((expandedRowEnd + 1) * step, 0, frameHeight - 1);
  let detectedWidth = right - left;
  let detectedHeight = bottom - top;

  if (
    boardSize &&
    usedWidth &&
    usedHeight &&
    usedWidth > 0 &&
    usedHeight > 0 &&
    boardSize >= usedWidth &&
    boardSize >= usedHeight
  ) {
    if (usedWidth < boardSize) {
      right = clamp(left + (detectedWidth * boardSize) / usedWidth, 0, frameWidth - 1);
    }
    if (usedHeight < boardSize) {
      bottom = clamp(top + (detectedHeight * boardSize) / usedHeight, 0, frameHeight - 1);
    }
    detectedWidth = right - left;
    detectedHeight = bottom - top;
  }

  const edgeOffset = clamp(Math.round(step * 2.4), 3, 18);
  const horizontalMargin = clamp(Math.round(Math.max(step * 9, detectedWidth * 0.08)), 8, 44);
  const verticalMargin = clamp(Math.round(Math.max(step * 9, detectedHeight * 0.08)), 8, 44);

  const refinedLeft = refineRectEdge({
    initial: left,
    min: clamp(left - horizontalMargin, 0, frameWidth - 2),
    max: clamp(left + horizontalMargin, 1, frameWidth - 2),
    scorer: (candidate) =>
      scoreVerticalEdge({
        frameData,
        frameWidth,
        frameHeight,
        borderReference,
        x: candidate,
        top,
        bottom,
        offset: edgeOffset,
        direction: "left",
      }),
  });
  const refinedRight = refineRectEdge({
    initial: right,
    min: clamp(right - horizontalMargin, 1, frameWidth - 1),
    max: clamp(right + horizontalMargin, 1, frameWidth - 1),
    scorer: (candidate) =>
      scoreVerticalEdge({
        frameData,
        frameWidth,
        frameHeight,
        borderReference,
        x: candidate,
        top,
        bottom,
        offset: edgeOffset,
        direction: "right",
      }),
  });
  const refinedTop = refineRectEdge({
    initial: top,
    min: clamp(top - verticalMargin, 0, frameHeight - 2),
    max: clamp(top + verticalMargin, 1, frameHeight - 2),
    scorer: (candidate) =>
      scoreHorizontalEdge({
        frameData,
        frameWidth,
        frameHeight,
        borderReference,
        y: candidate,
        left: refinedLeft,
        right: refinedRight,
        offset: edgeOffset,
        direction: "top",
      }),
  });
  const refinedBottom = refineRectEdge({
    initial: bottom,
    min: clamp(bottom - verticalMargin, 1, frameHeight - 1),
    max: clamp(bottom + verticalMargin, 1, frameHeight - 1),
    scorer: (candidate) =>
      scoreHorizontalEdge({
        frameData,
        frameWidth,
        frameHeight,
        borderReference,
        y: candidate,
        left: refinedLeft,
        right: refinedRight,
        offset: edgeOffset,
        direction: "bottom",
      }),
  });

  left = Math.min(refinedLeft, refinedRight - 2);
  right = Math.max(refinedRight, refinedLeft + 2);
  top = Math.min(refinedTop, refinedBottom - 2);
  bottom = Math.max(refinedBottom, refinedTop + 2);
  detectedWidth = right - left;
  detectedHeight = bottom - top;

  const cornerOffset = clamp(Math.round(edgeOffset * 0.85), 3, 14);
  const cornerSearchRadiusX = clamp(
    Math.round(Math.max(step * 4.2, detectedWidth * 0.06)),
    6,
    42,
  );
  const cornerSearchRadiusY = clamp(
    Math.round(Math.max(step * 4.2, detectedHeight * 0.06)),
    6,
    42,
  );

  const topLeft = refineCornerPoint({
    frameData,
    frameWidth,
    frameHeight,
    borderReference,
    initial: { x: left, y: top },
    searchRadiusX: cornerSearchRadiusX,
    searchRadiusY: cornerSearchRadiusY,
    offset: cornerOffset,
    corner: "topLeft",
  });
  const topRight = refineCornerPoint({
    frameData,
    frameWidth,
    frameHeight,
    borderReference,
    initial: { x: right, y: top },
    searchRadiusX: cornerSearchRadiusX,
    searchRadiusY: cornerSearchRadiusY,
    offset: cornerOffset,
    corner: "topRight",
  });
  const bottomRight = refineCornerPoint({
    frameData,
    frameWidth,
    frameHeight,
    borderReference,
    initial: { x: right, y: bottom },
    searchRadiusX: cornerSearchRadiusX,
    searchRadiusY: cornerSearchRadiusY,
    offset: cornerOffset,
    corner: "bottomRight",
  });
  const bottomLeft = refineCornerPoint({
    frameData,
    frameWidth,
    frameHeight,
    borderReference,
    initial: { x: left, y: bottom },
    searchRadiusX: cornerSearchRadiusX,
    searchRadiusY: cornerSearchRadiusY,
    offset: cornerOffset,
    corner: "bottomLeft",
  });

  left = Math.min(topLeft.x, bottomLeft.x);
  right = Math.max(topRight.x, bottomRight.x);
  top = Math.min(topLeft.y, topRight.y);
  bottom = Math.max(bottomLeft.y, bottomRight.y);
  detectedWidth = right - left;
  detectedHeight = bottom - top;

  if (
    detectedWidth < frameWidth * 0.22 ||
    detectedHeight < frameHeight * 0.22 ||
    detectedWidth > frameWidth * 0.96 ||
    detectedHeight > frameHeight * 0.96
  ) {
    return {
      corners: null,
      reason:
        detectedWidth < frameWidth * 0.22 || detectedHeight < frameHeight * 0.22
          ? "board_too_small"
          : "board_too_large",
      confidence: null,
    };
  }

  const widthRatio = detectedWidth / Math.max(1, frameWidth);
  const heightRatio = detectedHeight / Math.max(1, frameHeight);
  const rowStrength = rowBounds.threshold / Math.max(1, rowBounds.average);
  const colStrength = colBounds.threshold / Math.max(1, colBounds.average);
  const topWidth = Math.max(1, distance(topLeft, topRight));
  const bottomWidth = Math.max(1, distance(bottomLeft, bottomRight));
  const leftHeight = Math.max(1, distance(topLeft, bottomLeft));
  const rightHeight = Math.max(1, distance(topRight, bottomRight));
  const widthBalance = 1 - Math.min(1, Math.abs(topWidth - bottomWidth) / Math.max(topWidth, bottomWidth));
  const heightBalance = 1 - Math.min(1, Math.abs(leftHeight - rightHeight) / Math.max(leftHeight, rightHeight));
  const sizeScore =
    clamp((widthRatio - 0.22) / 0.4, 0, 1) * 0.5 +
    clamp((heightRatio - 0.22) / 0.4, 0, 1) * 0.5;
  const edgeScore =
    clamp((rowStrength - 1.1) / 0.65, 0, 1) * 0.5 +
    clamp((colStrength - 1.1) / 0.65, 0, 1) * 0.5;
  const geometryScore = widthBalance * 0.5 + heightBalance * 0.5;
  const confidenceScore = clamp(
    sizeScore * 0.34 + edgeScore * 0.38 + geometryScore * 0.28,
    0,
    1,
  );
  const confidence: VisionCornerDetectConfidence = {
    level:
      confidenceScore >= 0.76 ? "high" : confidenceScore >= 0.52 ? "medium" : "low",
    score: Math.round(confidenceScore * 100),
  };

  return {
    corners: [topLeft, topRight, bottomRight, bottomLeft],
    reason: null,
    confidence,
  };
};

export const detectBoardCorners = (
  options: DetectVisionBoardOptions,
): [VisionPoint, VisionPoint, VisionPoint, VisionPoint] | null => {
  return detectBoardCornersDetailed(options).corners;
};

export const interpolateQuadPoint = (
  corners: [VisionPoint, VisionPoint, VisionPoint, VisionPoint],
  u: number,
  v: number,
): VisionPoint => {
  const top = {
    x: lerp(corners[0].x, corners[1].x, u),
    y: lerp(corners[0].y, corners[1].y, u),
  };
  const bottom = {
    x: lerp(corners[3].x, corners[2].x, u),
    y: lerp(corners[3].y, corners[2].y, u),
  };

  return {
    x: lerp(top.x, bottom.x, v),
    y: lerp(top.y, bottom.y, v),
  };
};

export const sampleAverageRgb = (
  frameData: Uint8ClampedArray,
  frameWidth: number,
  frameHeight: number,
  point: VisionPoint,
  radius: number,
): VisionRgb => {
  const sampleRadius = Math.max(1, Math.round(radius));
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;

  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      const px = Math.round(point.x + dx);
      const py = Math.round(point.y + dy);
      if (px < 0 || py < 0 || px >= frameWidth || py >= frameHeight) {
        continue;
      }

      const offset = (py * frameWidth + px) * 4;
      red += frameData[offset];
      green += frameData[offset + 1];
      blue += frameData[offset + 2];
      count += 1;
    }
  }

  if (count === 0) {
    return [0, 0, 0];
  }

  return [
    Math.round(red / count),
    Math.round(green / count),
    Math.round(blue / count),
  ];
};

const analyzeSampleRegion = (
  frameData: Uint8ClampedArray,
  frameWidth: number,
  frameHeight: number,
  point: VisionPoint,
  radius: number,
): VisionSampleAnalysis => {
  const sampleRadius = Math.max(1, Math.round(radius));
  const pixels: VisionRgb[] = [];

  for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
    for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
      const px = Math.round(point.x + dx);
      const py = Math.round(point.y + dy);
      if (px < 0 || py < 0 || px >= frameWidth || py >= frameHeight) {
        continue;
      }

      const offset = (py * frameWidth + px) * 4;
      pixels.push([frameData[offset], frameData[offset + 1], frameData[offset + 2]]);
    }
  }

  if (!pixels.length) {
    return {
      rgb: [0, 0, 0],
      glareRatio: 0,
    };
  }

  const glarePixels = pixels.filter((pixel) => {
    const brightness = getRgbAverage(pixel);
    const tint = getRgbTint(pixel);
    return brightness >= 232 && tint <= 22;
  });

  const filteredPixels =
    glarePixels.length > 0 && glarePixels.length < pixels.length
      ? pixels.filter((pixel) => {
          const brightness = getRgbAverage(pixel);
          const tint = getRgbTint(pixel);
          return !(brightness >= 232 && tint <= 22);
        })
      : pixels;

  const reds = filteredPixels.map((pixel) => pixel[0]).sort((a, b) => a - b);
  const greens = filteredPixels.map((pixel) => pixel[1]).sort((a, b) => a - b);
  const blues = filteredPixels.map((pixel) => pixel[2]).sort((a, b) => a - b);
  const middleIndex = Math.floor(filteredPixels.length / 2);

  return {
    rgb: [reds[middleIndex], greens[middleIndex], blues[middleIndex]],
    glareRatio: glarePixels.length / pixels.length,
  };
};

export const sampleRobustRgb = (
  frameData: Uint8ClampedArray,
  frameWidth: number,
  frameHeight: number,
  point: VisionPoint,
  radius: number,
): VisionRgb =>
  analyzeSampleRegion(frameData, frameWidth, frameHeight, point, radius).rgb;

export const splitBeadDataIntoBoards = (
  beadData: BeadPixelData,
  boardSize: number,
): VisionBoardTile[] => {
  const colCount = Math.ceil(beadData.width / boardSize);
  const rowCount = Math.ceil(beadData.height / boardSize);
  const boards: VisionBoardTile[] = [];
  let boardIndex = 0;

  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const startX = col * boardSize;
      const startY = row * boardSize;
      const usedWidth = Math.max(
        0,
        Math.min(boardSize, beadData.width - startX),
      );
      const usedHeight = Math.max(
        0,
        Math.min(boardSize, beadData.height - startY),
      );

      const beads = new Array<BeadColor | null>(boardSize * boardSize).fill(
        null,
      );

      for (let y = 0; y < usedHeight; y++) {
        for (let x = 0; x < usedWidth; x++) {
          const sourceIndex = (startY + y) * beadData.width + (startX + x);
          beads[y * boardSize + x] = beadData.beads[sourceIndex];
        }
      }

      boards.push({
        index: boardIndex,
        label: `板${boardIndex + 1}`,
        startX,
        startY,
        boardSize,
        usedWidth,
        usedHeight,
        beads,
      });
      boardIndex += 1;
    }
  }

  return boards;
};

const chooseActiveColor = (
  colors: VisionColorProgress[],
  preferredColorId?: string | null,
) => {
  if (!colors.length) {
    return null;
  }

  const preferred = preferredColorId
    ? colors.find((item) => item.color.id === preferredColorId && item.remaining > 0)
    : null;

  if (preferred) {
    return preferred.color.id;
  }

  const firstRemaining = colors.find((item) => item.remaining > 0);
  return firstRemaining?.color.id || colors[0].color.id;
};

export const analyzeVisionProgress = ({
  frameData,
  frameWidth,
  frameHeight,
  boardTile,
  corners,
  emptyReferenceRgb,
  tolerance,
  preferredColorId,
}: AnalyzeVisionProgressOptions): VisionDetectionResult => {
  const boardSize = boardTile.boardSize;
  const quality = evaluateVisionQuality(emptyReferenceRgb);
  const boardPalette = Array.from(
    new Map(
      boardTile.beads
        .filter((bead): bead is BeadColor => Boolean(bead))
        .map((bead) => [bead.id, bead]),
    ).values(),
  );
  const topSize = distance(corners[0], corners[1]) / boardSize;
  const bottomSize = distance(corners[3], corners[2]) / boardSize;
  const leftSize = distance(corners[0], corners[3]) / boardSize;
  const rightSize = distance(corners[1], corners[2]) / boardSize;
  const markerRadius = clamp(
    Math.round((topSize + bottomSize + leftSize + rightSize) / 16),
    3,
    10,
  );

  const lightingCompensation = clamp(
    Math.max(0, 125 - quality.brightness) * 0.2 +
      Math.max(0, quality.tint - 18) * 0.5 +
      Math.max(0, quality.brightness - 232) * 0.28,
    0,
    18,
  );
  const targetThreshold = clamp(26 + tolerance * 0.75 + lightingCompensation, 28, 118);
  const emptyThreshold = clamp(18 + tolerance * 0.65 + lightingCompensation * 0.75, 20, 96);

  let totalTargetCells = 0;
  let matchedCells = 0;
  let missingCells = 0;
  let wrongCells = 0;
  let extraFilledCells = 0;
  let glareAffectedCells = 0;

  const colorMap = new Map<string, VisionColorProgress>();
  const cells: VisionDetectedCell[] = [];

  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const index = y * boardSize + x;
      const target = boardTile.beads[index];
      const center = interpolateQuadPoint(
        corners,
        (x + 0.5) / boardSize,
        (y + 0.5) / boardSize,
      );
      const sampleAnalysis = analyzeSampleRegion(
        frameData,
        frameWidth,
        frameHeight,
        center,
        markerRadius * 0.75,
      );
      const sample = sampleAnalysis.rgb;
      if (sampleAnalysis.glareRatio >= 0.12) {
        glareAffectedCells += 1;
      }
      const normalizedSample = normalizeSampleByEmptyReference(sample, emptyReferenceRgb);

      const emptyDistance = rgbDistance(sample, emptyReferenceRgb);

      let state: VisionCellState = "empty";
      let detectedColor: BeadColor | null = null;
      let detectedDistance: number | null = null;

      if (!target) {
        if (emptyDistance > emptyThreshold) {
          state = "extra";
          extraFilledCells += 1;
          const closest = findClosestBeadColor(normalizedSample, boardPalette);
          detectedColor = closest?.color || null;
          detectedDistance = closest?.distance || null;
        }
      } else {
        totalTargetCells += 1;
        const targetDistance = rgbDistance(normalizedSample, getBeadRgb(target));
        const existing =
          colorMap.get(target.id) ||
          ({
            color: target,
            total: 0,
            matched: 0,
            remaining: 0,
            wrong: 0,
          } as VisionColorProgress);

        existing.total += 1;

        if (targetDistance <= targetThreshold) {
          state = "matched";
          matchedCells += 1;
          existing.matched += 1;
          detectedColor = target;
          detectedDistance = targetDistance;
        } else if (emptyDistance <= emptyThreshold) {
          state = "missing";
          missingCells += 1;
        } else {
          state = "wrong";
          wrongCells += 1;
          existing.wrong += 1;
          const closest = findClosestBeadColor(normalizedSample, boardPalette);
          detectedColor = closest?.color || null;
          detectedDistance = closest?.distance || null;
        }

        colorMap.set(target.id, existing);
      }

      cells.push({
        index,
        x,
        y,
        center,
        target,
        sample,
        state,
        detectedColor,
        detectedDistance,
      });
    }
  }

  const colors = Array.from(colorMap.values())
    .map((item) => ({
      ...item,
      remaining: Math.max(0, item.total - item.matched),
    }))
    .sort((left, right) => {
      if (right.remaining !== left.remaining) {
        return right.remaining - left.remaining;
      }
      return right.total - left.total;
    });

  const activeColorId = chooseActiveColor(colors, preferredColorId);
  const activeColor = activeColorId
    ? colors.find((item) => item.color.id === activeColorId) || null
    : null;

  const guideCells = cells.filter(
    (cell) =>
      cell.target &&
      cell.target.id === activeColorId &&
      cell.state !== "matched",
  );
  const matchedGuideCells = cells.filter(
    (cell) =>
      cell.target &&
      cell.target.id === activeColorId &&
      cell.state === "matched",
  );
  const wrongGuideCells = cells.filter(
    (cell) =>
      cell.target &&
      cell.target.id === activeColorId &&
      cell.state === "wrong",
  );
  const wrongCellsDetail = cells.filter((cell) => cell.state === "wrong");
  const wrongColorSuggestionMap = new Map<string, VisionWrongColorSuggestion>();

  wrongCellsDetail.forEach((cell) => {
    const key = `${cell.detectedColor?.id || "none"}=>${cell.target?.id || "none"}`;
    const existing = wrongColorSuggestionMap.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }

    wrongColorSuggestionMap.set(key, {
      sourceColor: cell.detectedColor,
      targetColor: cell.target,
      count: 1,
    });
  });

  const wrongColorSuggestions = Array.from(wrongColorSuggestionMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const glareRatio =
    totalTargetCells > 0 ? glareAffectedCells / totalTargetCells : 0;

  quality.glareRatio = glareRatio;
  if (glareRatio >= 0.28) {
    quality.issues.push("局部反光偏强");
    quality.level = "poor";
  } else if (glareRatio >= 0.12) {
    quality.issues.push("有少量反光");
    if (quality.level === "good") {
      quality.level = "warning";
    }
  }

  return {
    totalTargetCells,
    matchedCells,
    missingCells,
    wrongCells,
    extraFilledCells,
    progress: totalTargetCells > 0 ? matchedCells / totalTargetCells : 0,
    activeColorId,
    activeColorMatched: activeColor?.matched || 0,
    activeColorRemaining: activeColor?.remaining || 0,
    colors,
    guideCells,
    matchedGuideCells,
    wrongGuideCells,
    wrongCellsDetail,
    detectedCells: cells,
    wrongColorSuggestions,
    quality,
    markerRadius,
  };
};

export const findBestVisionBoardMatch = ({
  frameData,
  frameWidth,
  frameHeight,
  boardTiles,
  corners,
  emptyReferenceRgb,
  tolerance,
  preferredColorId,
}: FindBestBoardMatchOptions): VisionBoardMatchResult | null => {
  let bestMatch: VisionBoardMatchResult | null = null;

  for (const tile of boardTiles) {
    const detection = analyzeVisionProgress({
      frameData,
      frameWidth,
      frameHeight,
      boardTile: tile,
      corners,
      emptyReferenceRgb,
      tolerance,
      preferredColorId,
    });

    const score = calculateVisionBoardMatchScore(detection);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        tile,
        detection,
        score,
      };
    }
  }

  return bestMatch;
};
