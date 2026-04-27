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

test('simplifyPresetOptions exposes five user-facing levels', async () => {
  const beadColors = await beadColorsPromise;

  assert.deepEqual(
    beadColors.simplifyPresetOptions.map((item) => item.id),
    ['faithful', 'light', 'balanced', 'strong', 'minimal'],
  );
});

test('simplify presets map to stable color limits', async () => {
  const beadColors = await beadColorsPromise;

  assert.equal(beadColors.simplifyPresetToColorLimit('faithful'), 291);
  assert.equal(beadColors.simplifyPresetToColorLimit('light'), 200);
  assert.equal(beadColors.simplifyPresetToColorLimit('balanced'), 150);
  assert.equal(beadColors.simplifyPresetToColorLimit('strong'), 96);
  assert.equal(beadColors.simplifyPresetToColorLimit('minimal'), 72);
});

test('legacy color counts map to nearest simplify preset buckets', async () => {
  const beadColors = await beadColorsPromise;

  assert.equal(beadColors.mapLegacyColorCountToSimplifyPreset(291), 'faithful');
  assert.equal(beadColors.mapLegacyColorCountToSimplifyPreset(200), 'light');
  assert.equal(beadColors.mapLegacyColorCountToSimplifyPreset(150), 'balanced');
  assert.equal(beadColors.mapLegacyColorCountToSimplifyPreset(96), 'strong');
  assert.equal(beadColors.mapLegacyColorCountToSimplifyPreset(72), 'minimal');
});

test('legacy editor state chooses balanced when color count is missing', async () => {
  const beadColors = await beadColorsPromise;

  assert.equal(beadColors.normalizeSimplifyPresetFromLegacy(undefined), 'balanced');
});

test('legacy editor state maps 96 to strong preset', async () => {
  const beadColors = await beadColorsPromise;

  assert.equal(beadColors.normalizeSimplifyPresetFromLegacy(96), 'strong');
});

test('mard-221 clamps faithful preset to official palette size', async () => {
  const beadColors = await beadColorsPromise;

  assert.equal(beadColors.resolveSimplifyColorLimit('faithful', 'mard-221', 0), 221);
});

test('my-colors clamps simplify preset to personal inventory size', async () => {
  const beadColors = await beadColorsPromise;

  assert.equal(beadColors.resolveSimplifyColorLimit('faithful', 'my-colors', 87), 87);
});
