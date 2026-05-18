import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPaginatedZipFilename,
  createStoredZipBlob,
} from "../perler-beads/src/utils/zipExport.js";

const readUint16 = (view, offset) => view.getUint16(offset, true);
const readUint32 = (view, offset) => view.getUint32(offset, true);

test("paginated ZIP filename is distinct from individual board PNG names", () => {
  assert.equal(
    buildPaginatedZipFilename({
      width: 130,
      height: 60,
      timestamp: "20260515",
    }),
    "perler-130x60-boards-20260515.zip",
  );
});

test("stored ZIP blob contains every generated PNG entry in one archive", async () => {
  const zipBlob = await createStoredZipBlob([
    {
      name: "perler-130x60-overview-20260515.png",
      blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" }),
    },
    {
      name: "perler-130x60-board1-p1of2-20260515.png",
      blob: new Blob([new Uint8Array([5, 6, 7])], { type: "image/png" }),
    },
  ]);

  assert.equal(zipBlob.type, "application/zip");

  const bytes = new Uint8Array(await zipBlob.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const view = new DataView(bytes.buffer);

  assert.equal(readUint32(view, 0), 0x04034b50);
  assert.ok(text.includes("perler-130x60-overview-20260515.png"));
  assert.ok(text.includes("perler-130x60-board1-p1of2-20260515.png"));

  const eocdOffset = bytes.length - 22;
  assert.equal(readUint32(view, eocdOffset), 0x06054b50);
  assert.equal(readUint16(view, eocdOffset + 10), 2);
  assert.equal(readUint16(view, eocdOffset + 8), 2);

  const centralDirectoryOffset = readUint32(view, eocdOffset + 16);
  assert.equal(readUint32(view, centralDirectoryOffset), 0x02014b50);
});
