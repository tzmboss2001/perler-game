import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const visionPath = new URL(
  "../perler-beads/src/services/visionAssistService.ts",
  import.meta.url,
);
const source = readFileSync(visionPath, "utf8");

test("vision detection result exposes all detected cells for photo progress preview", () => {
  assert.match(source, /detectedCells:\s*VisionDetectedCell\[\]/);
  assert.match(source, /detectedCells:\s*cells/);
});
