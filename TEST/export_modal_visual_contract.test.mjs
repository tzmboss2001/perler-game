import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../perler-beads/src/components/ExportModal.tsx", import.meta.url),
  "utf8",
);

test("export option buttons avoid React border shorthand conflicts", () => {
  assert.doesNotMatch(
    source,
    /borderColor:\s*selectedOption/,
    "dynamic export option border must use a full border value instead of borderColor",
  );
  assert.match(source, /border:\s*`1px solid \$\{/);
});

test("paginated export downloads a single ZIP package instead of many PNG prompts", () => {
  assert.match(source, /createStoredZipBlob\(zipFiles\)/);
  assert.match(source, /buildPaginatedZipFilename\(/);
  assert.match(source, /将下载 1 个 ZIP 压缩包/);
  assert.doesNotMatch(
    source,
    /await new Promise\(\(resolve\) => setTimeout\(resolve, 200\)\)/,
    "paginated export should not rely on delayed repeated browser downloads",
  );
});
