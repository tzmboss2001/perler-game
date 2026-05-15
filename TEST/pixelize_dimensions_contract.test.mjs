import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("../perler-beads/node_modules/typescript");

function loadPixelizeService() {
  const source = fs.readFileSync("perler-beads/src/services/pixelizeService.ts", "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const sandbox = {
    exports: {},
    document: {
      createElement(tagName) {
        assert.equal(tagName, "canvas");
        return {
          width: 0,
          height: 0,
          getContext(type) {
            assert.equal(type, "2d");
            return {
              imageSmoothingEnabled: false,
              imageSmoothingQuality: "low",
              drawImage() {},
              getImageData: (_x, _y, width, height) => ({
                data: new Uint8ClampedArray(width * height * 4),
              }),
            };
          },
        };
      },
    },
  };

  vm.runInNewContext(output, sandbox);
  return sandbox.exports;
}

test("pixelizeFromImage supports the editor 240 bead width without aspect distortion", () => {
  const { pixelizeFromImage } = loadPixelizeService();
  const sourceImage = { width: 100, height: 150 };

  const pixels = pixelizeFromImage(sourceImage, {
    gridWidth: 240,
    keepAspectRatio: true,
  });

  assert.equal(pixels.width, 240);
  assert.equal(pixels.height, 360);
});

test("pixelizeFromImage calculates aspect height from clamped final width", () => {
  const { pixelizeFromImage } = loadPixelizeService();
  const sourceImage = { width: 100, height: 150 };

  const pixels = pixelizeFromImage(sourceImage, {
    gridWidth: 8,
    keepAspectRatio: true,
  });

  assert.equal(pixels.width, 10);
  assert.equal(pixels.height, 15);
});
