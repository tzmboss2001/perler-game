import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("../perler-beads/node_modules/typescript");

function loadBoardService() {
  const source = fs.readFileSync("perler-beads/src/services/boardService.ts", "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const sandbox = { exports: {} };
  vm.runInNewContext(output, sandbox);
  return sandbox.exports;
}

test("ten-cell cross guides are returned only for complete 10x10 physical blocks", () => {
  const { getPhysicalBoardTenCellCrossGuides } = loadBoardService();
  const guides = getPhysicalBoardTenCellCrossGuides(54);
  const normalizedGuides = JSON.parse(JSON.stringify(guides));

  assert.equal(normalizedGuides.length, 25);
  assert.deepEqual(normalizedGuides[0], {
    startX: 2,
    startY: 2,
    endX: 12,
    endY: 12,
    centerX: 7,
    centerY: 7,
  });
  assert.deepEqual(normalizedGuides.at(-1), {
    startX: 42,
    startY: 42,
    endX: 52,
    endY: 52,
    centerX: 47,
    centerY: 47,
  });
  assert.equal(
    normalizedGuides.some((guide) => guide.startX === 0 || guide.startY === 0),
    false,
  );
});
