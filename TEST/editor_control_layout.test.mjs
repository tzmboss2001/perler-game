import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('../perler-beads/node_modules/typescript/lib/typescript.js');

const loadEditorControlLayoutModule = async () => {
  const sourcePath = fileURLToPath(new URL('../perler-beads/src/utils/editorControlLayout.ts', import.meta.url));
  const source = readFileSync(sourcePath, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      isolatedModules: true,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  });

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText, 'utf8').toString('base64')}`;
  return import(moduleUrl);
};

const layoutPromise = loadEditorControlLayoutModule();

test('389 及以下保持纵向堆叠', async () => {
  const layoutModule = await layoutPromise;
  assert.deepEqual(layoutModule.getEditorControlLayout(389), {
    isHorizontal: false,
    containerColumns: '1fr',
    previewColumnFlex: '1 1 100%',
    widthColumnFlex: '1 1 100%',
  });
});

test('390 及以上切换为 44/56 横向布局', async () => {
  const layoutModule = await layoutPromise;
  assert.deepEqual(layoutModule.getEditorControlLayout(390), {
    isHorizontal: true,
    containerColumns: 'minmax(0, 0.44fr) minmax(0, 0.56fr)',
    previewColumnFlex: '0 1 44%',
    widthColumnFlex: '0 1 56%',
  });
});
