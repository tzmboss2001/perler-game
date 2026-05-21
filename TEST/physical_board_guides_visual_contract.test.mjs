import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("making overlay and export renderers draw dashed ten-cell cross guides from shared geometry", () => {
  const makingSource = fs.readFileSync("perler-beads/src/pages/mobile/MakingPage.tsx", "utf8");
  const exportSource = fs.readFileSync("perler-beads/src/services/colorMatchService.ts", "utf8");

  assert.match(makingSource, /getPhysicalBoardTenCellCrossGuides/);
  assert.match(makingSource, /tenCellCrossGuides/);
  assert.match(
    makingSource,
    /ctx\.setLineDash\(\[\s*Math\.max\(2, Math\.min\(8, drawCellSize \* 0\.28\)\),\s*Math\.max\(2, Math\.min\(7, drawCellSize \* 0\.22\)\),\s*\]\)/,
  );

  assert.match(exportSource, /getPhysicalBoardTenCellCrossGuides/);
  assert.match(exportSource, /drawTenCellCrossGuides/);
  assert.match(
    exportSource,
    /ctx\.setLineDash\(\[Math\.max\(2, cellSize \* 0\.25\), Math\.max\(2, cellSize \* 0\.2\)\]\)/,
  );
});
