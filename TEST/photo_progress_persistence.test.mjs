import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPhotoProgressSnapshot,
  confirmPhotoProgressPreview,
  createPhotoProgressBeadDataHash,
  createPhotoProgressPreview,
  createPhotoProgressStorageKey,
  readPhotoProgressSnapshot,
  savePhotoProgressSnapshot,
} from "../perler-beads/src/services/photoProgressService.js";

const createMemoryStorage = ({ failSet = false } = {}) => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => {
      if (failSet) {
        throw new Error("quota exceeded");
      }
      values.set(key, String(value));
    },
    removeItem: (key) => {
      values.delete(key);
    },
    dump: () => new Map(values),
  };
};

const createBeadData = (ids = ["A1", "B2", null, "A1"]) => ({
  width: 2,
  height: 2,
  beads: ids.map((id) => (id ? { id, hex: id === "A1" ? "#111111" : "#222222" } : null)),
});

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
          detectedDistance: 24,
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
          detectedDistance: 95,
          state: "matched",
          sample: [17, 17, 17],
          center: { x: 15, y: 15 },
        },
      ],
    },
  });

test("photo progress bead data hash is stable and changes when the pattern changes", () => {
  const first = createPhotoProgressBeadDataHash(createBeadData());
  const same = createPhotoProgressBeadDataHash(createBeadData());
  const changedColor = createPhotoProgressBeadDataHash(createBeadData(["A1", "A1", null, "A1"]));
  const changedSize = createPhotoProgressBeadDataHash({
    width: 1,
    height: 4,
    beads: createBeadData().beads,
  });

  assert.match(first, /^v1_[0-9a-f]+$/);
  assert.equal(first, same);
  assert.notEqual(first, changedColor);
  assert.notEqual(first, changedSize);
});

test("photo progress persistence saves only user-confirmed done candidates", () => {
  const storage = createMemoryStorage();
  const beadDataHash = createPhotoProgressBeadDataHash(createBeadData());
  const preview = createPreview();
  const snapshot = confirmPhotoProgressPreview({
    preview,
    confirmedCellIndexes: [0, 1, 2, 3],
    confirmedAt: 1710000001000,
  });

  const saved = savePhotoProgressSnapshot({
    storage,
    projectId: "local_12",
    beadDataHash,
    snapshot,
    savedAt: 1710000002000,
  });
  const restored = readPhotoProgressSnapshot({
    storage,
    projectId: "local_12",
    beadDataHash,
  });

  assert.equal(saved.ok, true);
  assert.equal(restored.status, "restored");
  assert.equal(restored.snapshot.completedCount, 1);
  assert.deepEqual(restored.snapshot.confirmedCells.map((cell) => cell.index), [0]);
  assert.equal(restored.snapshot.beadDataHash, beadDataHash);
  assert.equal(restored.snapshot.projectId, "local_12");
});

test("photo progress persistence rejects empty confirmed snapshots", () => {
  const storage = createMemoryStorage();
  const beadDataHash = createPhotoProgressBeadDataHash(createBeadData());
  const preview = createPreview();
  const snapshot = confirmPhotoProgressPreview({
    preview,
    confirmedCellIndexes: [1, 2, 3],
    confirmedAt: 1710000001000,
  });

  const saved = savePhotoProgressSnapshot({
    storage,
    projectId: "local_12",
    beadDataHash,
    snapshot,
    savedAt: 1710000002000,
  });

  assert.equal(snapshot.completedCount, 0);
  assert.equal(saved.ok, false);
  assert.equal(saved.reason, "empty_confirmed_cells");
  assert.equal(storage.dump().size, 0);
});

test("photo progress persistence blocks restore when beadDataHash does not match payload", () => {
  const storage = createMemoryStorage();
  const currentHash = createPhotoProgressBeadDataHash(createBeadData());
  const staleHash = createPhotoProgressBeadDataHash(createBeadData(["B2", "B2", null, "A1"]));
  const key = createPhotoProgressStorageKey({
    projectId: "local_12",
    beadDataHash: currentHash,
  });
  const preview = createPreview();
  const snapshot = confirmPhotoProgressPreview({
    preview,
    confirmedCellIndexes: [0],
    confirmedAt: 1710000001000,
  });

  storage.setItem(
    key,
    JSON.stringify({
      ...snapshot,
      projectId: "local_12",
      beadDataHash: staleHash,
      savedAt: 1710000002000,
    }),
  );

  const restored = readPhotoProgressSnapshot({
    storage,
    projectId: "local_12",
    beadDataHash: currentHash,
  });

  assert.equal(restored.status, "hash_mismatch");
  assert.equal(restored.snapshot, null);
});

test("photo progress persistence reports save failure without writing partial state", () => {
  const storage = createMemoryStorage({ failSet: true });
  const beadDataHash = createPhotoProgressBeadDataHash(createBeadData());
  const snapshot = confirmPhotoProgressPreview({
    preview: createPreview(),
    confirmedCellIndexes: [0],
    confirmedAt: 1710000001000,
  });

  const saved = savePhotoProgressSnapshot({
    storage,
    projectId: "local_12",
    beadDataHash,
    snapshot,
    savedAt: 1710000002000,
  });

  assert.equal(saved.ok, false);
  assert.equal(saved.reason, "save_failed");
  assert.match(saved.message, /保存失败/);
});

test("photo progress persistence clears a saved snapshot", () => {
  const storage = createMemoryStorage();
  const beadDataHash = createPhotoProgressBeadDataHash(createBeadData());
  const snapshot = confirmPhotoProgressPreview({
    preview: createPreview(),
    confirmedCellIndexes: [0],
    confirmedAt: 1710000001000,
  });

  savePhotoProgressSnapshot({
    storage,
    projectId: "local_12",
    beadDataHash,
    snapshot,
    savedAt: 1710000002000,
  });
  const cleared = clearPhotoProgressSnapshot({
    storage,
    projectId: "local_12",
    beadDataHash,
  });
  const restored = readPhotoProgressSnapshot({
    storage,
    projectId: "local_12",
    beadDataHash,
  });

  assert.equal(cleared.ok, true);
  assert.equal(restored.status, "missing");
});
