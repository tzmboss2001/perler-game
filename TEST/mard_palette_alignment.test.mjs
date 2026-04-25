import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('../perler-beads/node_modules/typescript/lib/typescript.js');

const loadBeadColorsModule = async () => {
  const sourcePath = fileURLToPath(new URL('../perler-beads/src/data/beadColors.ts', import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      isolatedModules: true,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: sourcePath,
  });

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText, 'utf8').toString('base64')}`;
  return import(moduleUrl);
};

const beadColorsPromise = loadBeadColorsModule();

test('MARD 官方色库只保留 221 和 291 两种官方方案', async () => {
  const beadColors = await beadColorsPromise;

  assert.equal(beadColors.mardColors.length, 291);
  assert.equal(beadColors.mard221Colors.length, 221);
  assert.deepEqual(
    beadColors.officialPaletteOptions.map((item) => item.id),
    ['mard-221', 'mard-291'],
  );
});

test('colorLimitOptions 只保留 48 / 72 / 96 / 150 / 200 / 291 六档', async () => {
  const beadColors = await beadColorsPromise;

  assert.deepEqual(
    beadColors.colorLimitOptions.map((item) => item.count),
    [48, 72, 96, 150, 200, 291],
  );
});

test('normalizePaletteSelection 对旧项目数据使用 mard-291 回退语义', async () => {
  const beadColors = await beadColorsPromise;

  const legacyResult = beadColors.normalizePaletteSelection({
    colorCount: 96,
  });

  assert.deepEqual(legacyResult, {
    paletteMode: 'mard-291',
    colorLimit: 96,
  });

  const invalidModeResult = beadColors.normalizePaletteSelection({
    colorCount: 150,
    paletteMode: 'unknown-mode',
  });

  assert.deepEqual(invalidModeResult, {
    paletteMode: 'mard-291',
    colorLimit: 150,
  });
});

test('clampColorLimitByPaletteSize 对 mard-221 与 my-colors 使用各自上限', async () => {
  const beadColors = await beadColorsPromise;

assert.equal(beadColors.clampColorLimitByPaletteSize('mard-221', 291, 0), 221);
assert.equal(beadColors.clampColorLimitByPaletteSize('mard-221', 96, 0), 96);
assert.equal(beadColors.clampColorLimitByPaletteSize('my-colors', 150, 18), 18);
assert.equal(beadColors.clampColorLimitByPaletteSize('my-colors', 150, 0), 0);
});

test('getPaletteColorsForMode 搴旇繑鍥炲綋鍓嶅熀纭€鑹插簱鍙敤棰滆壊闆嗗悎', async () => {
  const beadColors = await beadColorsPromise;

  assert.equal(beadColors.getPaletteColorsForMode('mard-221', []).length, 221);
  assert.equal(beadColors.getPaletteColorsForMode('mard-291', []).length, 291);
  assert.deepEqual(
    beadColors.getPaletteColorsForMode('my-colors', ['A1', 'A2']).map((item) => item.id),
    ['A1', 'A2'],
  );
  assert.equal(beadColors.getPaletteColorsForMode('my-colors', ['UNKNOWN']).length, 0);
});
