import test from "node:test";
import assert from "node:assert/strict";
import {
  createPhotoProgressPreview,
  confirmPhotoProgressPreview,
  createPhotoProgressStorageKey,
} from "../perler-beads/src/services/photoProgressService.js";
import { createSyntheticDetection } from "./photo_progress_synthetic_fixture.mjs";

const cell = (overrides) => ({
  index: 0,
  x: 0,
  y: 0,
  target: { id: "A1", hex: "#111111" },
  detectedColor: { id: "A1", hex: "#111111" },
  detectedDistance: 24,
  state: "matched",
  sample: [17, 17, 17],
  center: { x: 5, y: 5 },
  ...overrides,
});

const detection = (overrides = {}) => ({
  totalTargetCells: 4,
  matchedCells: 1,
  missingCells: 1,
  wrongCells: 1,
  extraFilledCells: 0,
  progress: 0.25,
  activeColorId: "A1",
  activeColorMatched: 1,
  activeColorRemaining: 0,
  colors: [],
  guideCells: [],
  matchedGuideCells: [],
  wrongGuideCells: [],
  wrongCellsDetail: [],
  wrongColorSuggestions: [],
  markerRadius: 4,
  quality: {
    level: "good",
    brightness: 128,
    tint: 0,
    glareRatio: 0,
    issues: [],
  },
  detectedCells: [
    cell({ index: 0, x: 0, y: 0, state: "matched", detectedDistance: 24 }),
    cell({
      index: 1,
      x: 1,
      y: 0,
      state: "missing",
      detectedColor: null,
      detectedDistance: null,
    }),
    cell({
      index: 2,
      x: 0,
      y: 1,
      state: "wrong",
      detectedColor: { id: "B2", hex: "#222222" },
      detectedDistance: 40,
    }),
    cell({ index: 3, x: 1, y: 1, state: "matched", detectedDistance: 92 }),
  ],
  ...overrides,
});

const previewFrom = (options = {}) =>
  createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 2,
    usedWidth: 2,
    usedHeight: 2,
    detection: detection(options.detection),
    hasEmptyReference: options.hasEmptyReference ?? true,
    createdAt: 1710000000000,
  });

test("photo progress preview classifies matched, pending, wrong, and low confidence cells", () => {
  const preview = previewFrom();

  assert.equal(preview.summary.doneCandidateCount, 1);
  assert.equal(preview.summary.pendingCount, 1);
  assert.equal(preview.summary.suspectedWrongCount, 1);
  assert.equal(preview.summary.lowConfidenceCount, 1);
});

test("poor quality downgrades done candidates to low confidence", () => {
  const preview = previewFrom({
    detection: {
      quality: {
        level: "poor",
        brightness: 245,
        tint: 30,
        glareRatio: 0.3,
        issues: ["glare"],
      },
    },
  });

  assert.equal(preview.qualityLevel, "poor");
  assert.equal(preview.summary.doneCandidateCount, 0);
  assert.equal(preview.summary.lowConfidenceCount, 2);
});

test("missing empty reference blocks done candidates", () => {
  const preview = previewFrom({ hasEmptyReference: false });

  assert.equal(preview.qualityLevel, "poor");
  assert.equal(preview.qualityIssues.includes("missing_empty_reference"), true);
  assert.equal(preview.summary.doneCandidateCount, 0);
  assert.equal(preview.summary.lowConfidenceCount, 2);
});

test("confirmed snapshot only persists selected done candidates", () => {
  const preview = previewFrom();

  const snapshot = confirmPhotoProgressPreview({
    preview,
    confirmedCellIndexes: [0, 2, 3],
    confirmedAt: 1710000001000,
  });

  assert.equal(snapshot.completedCount, 1);
  assert.deepEqual(snapshot.confirmedCells.map((item) => item.index), [0]);
  assert.equal(snapshot.suspectedWrongCount, 1);
  assert.equal(snapshot.lowConfidenceCount, 1);
});

test("storage key isolates project and bead data hash", () => {
  assert.equal(
    createPhotoProgressStorageKey({ projectId: 42, beadDataHash: "abc" }),
    "photo-progress:v1:42:abc",
  );
});

test("synthetic perfect board creates all done candidates", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: createSyntheticDetection({ variant: "perfect" }),
    hasEmptyReference: true,
    createdAt: 1710000000000,
  });

  assert.equal(preview.summary.doneCandidateCount, 16);
  assert.equal(preview.summary.suspectedWrongCount, 0);
});

test("synthetic wrong board separates suspected wrong from done candidates", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: createSyntheticDetection({ variant: "wrong" }),
    hasEmptyReference: true,
    createdAt: 1710000000000,
  });

  assert.equal(preview.summary.doneCandidateCount, 14);
  assert.equal(preview.summary.suspectedWrongCount, 2);
});

test("synthetic low quality board blocks done candidates", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: createSyntheticDetection({
      variant: "perfect",
      qualityLevel: "poor",
    }),
    hasEmptyReference: true,
    createdAt: 1710000000000,
  });

  assert.equal(preview.summary.doneCandidateCount, 0);
  assert.equal(preview.summary.lowConfidenceCount, 16);
});

test("photo progress reliability blocks previews with excessive suspected wrong ratio", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: {
      ...createSyntheticDetection({ variant: "wrong" }),
      detectedCells: Array.from({ length: 16 }, (_, index) =>
        cell({
          index,
          x: index % 4,
          y: Math.floor(index / 4),
          state: index < 8 ? "wrong" : "matched",
          detectedColor:
            index < 8
              ? { id: "B2", hex: "#222222" }
              : { id: "A1", hex: "#111111" },
          detectedDistance: index < 8 ? 44 : 24,
        }),
      ),
      totalTargetCells: 16,
      matchedCells: 8,
      wrongCells: 8,
      missingCells: 0,
      progress: 0.5,
      quality: {
        level: "good",
        brightness: 128,
        tint: 0,
        glareRatio: 0,
        issues: [],
      },
    },
    hasEmptyReference: true,
    createdAt: 1710000000000,
  });

  assert.equal(preview.reliability.level, "blocked");
  assert.equal(preview.reliability.userAction, "retry_required");
  assert.equal(preview.reliability.reasons.includes("wrong_ratio_too_high"), true);
  assert.equal(preview.reliability.wrongRatio, 0.5);
});

test("photo progress reliability allows clean high-confidence previews", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: createSyntheticDetection({ variant: "perfect" }),
    hasEmptyReference: true,
    createdAt: 1710000000000,
  });

  assert.equal(preview.reliability.level, "good");
  assert.equal(preview.reliability.userAction, "can_confirm");
  assert.equal(preview.reliability.reasons.length, 0);
});

test("photo progress reliability blocks previews with excessive low confidence ratio", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: {
      ...createSyntheticDetection({ variant: "perfect" }),
      detectedCells: Array.from({ length: 16 }, (_, index) =>
        cell({
          index,
          x: index % 4,
          y: Math.floor(index / 4),
          state: "matched",
          detectedDistance: index < 8 ? 92 : 24,
        }),
      ),
      totalTargetCells: 16,
      matchedCells: 16,
      wrongCells: 0,
      missingCells: 0,
      progress: 1,
      quality: {
        level: "good",
        brightness: 128,
        tint: 0,
        glareRatio: 0,
        issues: [],
      },
    },
    hasEmptyReference: true,
    createdAt: 1710000000000,
  });

  assert.equal(preview.reliability.level, "blocked");
  assert.equal(
    preview.reliability.reasons.includes("low_confidence_ratio_too_high"),
    true,
  );
  assert.equal(preview.reliability.lowConfidenceRatio, 0.5);
});
