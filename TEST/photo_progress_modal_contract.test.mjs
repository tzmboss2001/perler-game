import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const modalPath = new URL(
  "../perler-beads/src/components/PhotoProgressSyncModal.tsx",
  import.meta.url,
);
const makingPath = new URL(
  "../perler-beads/src/pages/mobile/MakingPage.tsx",
  import.meta.url,
);

const read = (path) => readFileSync(path, "utf8");

test("photo progress modal file exists", () => {
  assert.equal(existsSync(modalPath), true);
});

test("photo progress modal exposes upload, calibration, reference, preview, and error states", () => {
  const source = read(modalPath);

  assert.match(source, /type PhotoProgressSyncStep/);
  assert.match(source, /"upload"/);
  assert.match(source, /"corners"/);
  assert.match(source, /"empty-reference"/);
  assert.match(source, /"preview"/);
  assert.match(source, /"error"/);
});

test("photo progress modal uses static image upload and recognition preview only", () => {
  const source = read(modalPath);

  assert.match(source, /type="file"/);
  assert.match(source, /accept="image\/\*"/);
  assert.match(source, /capture="environment"/);
  assert.match(source, /drawImageToCanvas/);
  assert.match(source, /getImagePoint/);
  assert.match(source, /handleImageClick/);
  assert.match(source, /sampleCanvasRgb/);
  assert.match(source, /runPreview/);
  assert.match(source, /analyzeVisionProgress/);
  assert.match(source, /createPhotoProgressPreview/);
  assert.doesNotMatch(source, /confirmPhotoProgressPreview/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
  assert.doesNotMatch(source, /projectApi\.updateProgress/);
  assert.doesNotMatch(source, /findBestVisionBoardMatch/);
});

test("photo progress modal is fixed overlay and does not occupy making layout", () => {
  const source = read(modalPath);

  assert.match(source, /position:\s*"fixed"/);
  assert.match(source, /zIndex/);
  assert.doesNotMatch(source, /position:\s*"static"/);
});

test("making page wires photo sync entry without replacing existing vision assist", () => {
  const source = read(makingPath);

  assert.match(source, /PhotoProgressSyncModal/);
  assert.match(source, /showPhotoProgressSync/);
  assert.match(source, /setShowPhotoProgressSync\(true\)/);
  assert.match(source, /拍照同步/);
  assert.match(source, /setShowVisionAssist\(true\)/);
  assert.match(source, /BoardVisionAssistModal/);
});
