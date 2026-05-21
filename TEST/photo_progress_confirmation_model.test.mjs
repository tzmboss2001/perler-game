import assert from "node:assert/strict";
import test from "node:test";
import {
  createPhotoProgressConfirmationModel,
  createPhotoProgressPreview,
} from "../perler-beads/src/services/photoProgressService.js";

const createPreview = () =>
  createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 2,
    usedWidth: 2,
    usedHeight: 2,
    createdAt: 1710000000000,
    hasEmptyReference: true,
    detection: {
      totalTargetCells: 4,
      matchedCells: 2,
      missingCells: 1,
      wrongCells: 1,
      extraFilledCells: 0,
      progress: 0.5,
      activeColorId: "A1",
      activeColorMatched: 0,
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
        {
          index: 0,
          x: 0,
          y: 0,
          target: { id: "A1", hex: "#111111" },
          detectedColor: { id: "A1", hex: "#111111" },
          detectedDistance: 20,
          state: "matched",
          sample: [17, 17, 17],
          center: { x: 5, y: 5 },
        },
        {
          index: 1,
          x: 1,
          y: 0,
          target: { id: "B2", hex: "#222222" },
          detectedColor: null,
          detectedDistance: null,
          state: "missing",
          sample: [255, 255, 255],
          center: { x: 15, y: 5 },
        },
        {
          index: 2,
          x: 0,
          y: 1,
          target: { id: "A1", hex: "#111111" },
          detectedColor: { id: "B2", hex: "#222222" },
          detectedDistance: 48,
          state: "wrong",
          sample: [34, 34, 34],
          center: { x: 5, y: 15 },
        },
        {
          index: 3,
          x: 1,
          y: 1,
          target: { id: "A1", hex: "#111111" },
          detectedColor: { id: "A1", hex: "#111111" },
          detectedDistance: 96,
          state: "matched",
          sample: [17, 17, 17],
          center: { x: 15, y: 15 },
        },
      ],
    },
  });

test("confirmation model selects only high-confidence done candidates by default", () => {
  const model = createPhotoProgressConfirmationModel({ preview: createPreview() });

  assert.deepEqual(model.defaultSelectedCellIndexes, [0]);
  assert.deepEqual(model.selectableCellIndexes, [0]);
  assert.equal(model.blockedCounts.suspectedWrong, 1);
  assert.equal(model.blockedCounts.lowConfidence, 1);
  assert.equal(model.blockedCounts.pending, 1);
  assert.equal(model.canSaveDefaultSelection, true);
});

test("confirmation model rejects previews without selectable done candidates", () => {
  const preview = {
    ...createPreview(),
    cells: createPreview().cells.map((cell) => ({
      ...cell,
      state: cell.state === "done_candidate" ? "low_confidence" : cell.state,
    })),
  };
  const model = createPhotoProgressConfirmationModel({ preview });

  assert.deepEqual(model.defaultSelectedCellIndexes, []);
  assert.equal(model.canSaveDefaultSelection, false);
});
