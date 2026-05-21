import assert from "node:assert/strict";
import test from "node:test";
import { createPhotoProgressPreview } from "../perler-beads/src/services/photoProgressService.js";
import { createSyntheticDetection } from "./photo_progress_synthetic_fixture.mjs";

const createPreview = ({ variant = "perfect", qualityLevel = "good" } = {}) =>
  createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: createSyntheticDetection({ variant, qualityLevel }),
    hasEmptyReference: true,
    createdAt: 1710000000000,
  });

test("phase1b acceptance: all-correct synthetic board becomes done candidates only", () => {
  const preview = createPreview({ variant: "perfect" });

  assert.equal(preview.summary.doneCandidateCount, 16);
  assert.equal(preview.summary.pendingCount, 0);
  assert.equal(preview.summary.suspectedWrongCount, 0);
  assert.equal(preview.summary.lowConfidenceCount, 0);
});

test("phase1b acceptance: partly unfinished synthetic board keeps unknown/pending cells", () => {
  const preview = createPreview({ variant: "missing" });

  assert.equal(preview.summary.doneCandidateCount, 12);
  assert.equal(preview.summary.pendingCount, 4);
  assert.equal(preview.summary.suspectedWrongCount, 0);
  assert.equal(preview.summary.lowConfidenceCount, 0);
});

test("phase1b acceptance: single wrong-color cell remains suspected wrong", () => {
  const preview = createPreview({ variant: "single-wrong" });

  assert.equal(preview.summary.doneCandidateCount, 15);
  assert.equal(preview.summary.pendingCount, 0);
  assert.equal(preview.summary.suspectedWrongCount, 1);
  assert.equal(preview.summary.lowConfidenceCount, 0);
});

test("phase1b acceptance: low-confidence board blocks confirmed done candidates", () => {
  const preview = createPreview({ variant: "perfect", qualityLevel: "poor" });

  assert.equal(preview.summary.doneCandidateCount, 0);
  assert.equal(preview.summary.pendingCount, 0);
  assert.equal(preview.summary.suspectedWrongCount, 0);
  assert.equal(preview.summary.lowConfidenceCount, 16);
  assert.equal(preview.qualityLevel, "poor");
});
