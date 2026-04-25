import assert from "node:assert/strict";
import {
  clampPatternGridSize,
  guessPatternGridCandidates,
  classifyPatternCellConfidence,
  summarizeLowConfidenceCells,
  collectLowConfidenceIndices,
  getNextLowConfidenceReviewIndex,
  mergeImportReviewDraftFields,
} from "../perler-beads/src/utils/patternImport.js";

const run = (name, fn) => {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

run("guessPatternGridCandidates prefers square boards for square screenshots", () => {
  const result = guessPatternGridCandidates({ imageWidth: 1160, imageHeight: 1160, maxResults: 4 });
  assert.deepEqual(result.slice(0, 3), [
    { rows: 58, cols: 58 },
    { rows: 29, cols: 29 },
    { rows: 116, cols: 116 },
  ]);
});

run("guessPatternGridCandidates prefers rectangular boards for wide screenshots", () => {
  const result = guessPatternGridCandidates({ imageWidth: 2080, imageHeight: 1160, maxResults: 4 });
  assert.deepEqual(result[0], { rows: 58, cols: 104 });
  assert.deepEqual(result[1], { rows: 104, cols: 208 });
});

run("classifyPatternCellConfidence marks noisy mismatched cells as low confidence", () => {
  const result = classifyPatternCellConfidence({
    varianceScore: 34,
    matchDistance: 29,
    sampleCount: 36,
  });

  assert.equal(result.isLowConfidence, true);
  assert.equal(result.reason, "variance-and-distance");
});

run("classifyPatternCellConfidence keeps clean cells as trusted", () => {
  const result = classifyPatternCellConfidence({
    varianceScore: 8,
    matchDistance: 9,
    sampleCount: 36,
  });

  assert.equal(result.isLowConfidence, false);
  assert.equal(result.reason, "ok");
});

run("summarizeLowConfidenceCells reports count and coordinate preview", () => {
  const summary = summarizeLowConfidenceCells([
    { row: 0, col: 0 },
    { row: 2, col: 5 },
    { row: 6, col: 9 },
    { row: 8, col: 10 },
  ]);

  assert.equal(summary.count, 4);
  assert.equal(summary.preview, "1行1列、3行6列、7行10列");
});

run("clampPatternGridSize keeps values inside safe bounds", () => {
  assert.equal(clampPatternGridSize(0), 1);
  assert.equal(clampPatternGridSize(9999), 512);
  assert.equal(clampPatternGridSize(57.8), 58);
});
run("collectLowConfidenceIndices dedupes and filters out-of-range cells", () => {
  const result = collectLowConfidenceIndices([
    { row: 0, col: 0 },
    { row: 0, col: 0 },
    { row: 1, col: 2 },
    { row: -1, col: 3 },
    { row: 9, col: 9 },
  ], 4, 4);

  assert.deepEqual(result, [0, 6]);
});

run("getNextLowConfidenceReviewIndex cycles forward through review indices", () => {
  const indices = [4, 11, 29];

  assert.equal(getNextLowConfidenceReviewIndex(indices, null, 1), 4);
  assert.equal(getNextLowConfidenceReviewIndex(indices, 4, 1), 11);
  assert.equal(getNextLowConfidenceReviewIndex(indices, 29, 1), 4);
});

run("getNextLowConfidenceReviewIndex cycles backward through review indices", () => {
  const indices = [4, 11, 29];

  assert.equal(getNextLowConfidenceReviewIndex(indices, null, -1), 29);
  assert.equal(getNextLowConfidenceReviewIndex(indices, 11, -1), 4);
  assert.equal(getNextLowConfidenceReviewIndex(indices, 4, -1), 29);
});

run("mergeImportReviewDraftFields preserves external import review metadata", () => {
  const nextDraft = mergeImportReviewDraftFields(
    {
      importSource: "external-pattern-import",
      lowConfidenceCells: [{ row: 1, col: 2, reason: "variance" }],
    },
    {
      imageData: "data:image/png;base64,abc",
      beadData: { width: 2, height: 2, beads: [null, null, null, null] },
    }
  );

  assert.equal(nextDraft.importSource, "external-pattern-import");
  assert.deepEqual(nextDraft.lowConfidenceCells, [{ row: 1, col: 2, reason: "variance" }]);
});

run("mergeImportReviewDraftFields ignores non-import drafts", () => {
  const nextDraft = mergeImportReviewDraftFields(
    {
      importSource: "manual-upload",
      lowConfidenceCells: [{ row: 1, col: 2, reason: "variance" }],
    },
    {
      imageData: "data:image/png;base64,abc",
    }
  );

  assert.equal(nextDraft.importSource, undefined);
  assert.equal(nextDraft.lowConfidenceCells, undefined);
});
