import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("mobile single-board toolbar uses a stable 2x2 grid instead of 3 plus 1 wrap", () => {
  const source = fs.readFileSync("perler-beads/src/pages/mobile/MakingPage.tsx", "utf8");
  const navRowBlock = source.slice(
    source.indexOf("singleBoardMobileNavRow:"),
    source.indexOf("singleBoardMobileNavRowFill:"),
  );

  assert.match(source, /singleBoardMobileNavRow:\s*{\s*display:\s*"grid"/s);
  assert.match(source, /gridTemplateColumns:\s*"repeat\(2, minmax\(0, 1fr\)\)"/);
  assert.match(source, /singleBoardMobileNavRowFill:/);
  assert.match(source, /styles\.singleBoardMobileNavRowFill/);
  assert.doesNotMatch(navRowBlock, /flexWrap:\s*"wrap"/);
});
