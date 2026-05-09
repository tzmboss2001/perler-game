# Generation Quality Phase1-A Baseline System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lightweight Phase1-A baseline infrastructure that makes generation quality comparable through fixed samples, test matrices, result metadata, quality tags, before/after reports, regression checks, baseline archives, and bad-case tracking.

**Architecture:** Keep production generation and making-page code untouched. Store stable benchmark definitions under `TEST/generation-quality`, store reusable tooling under `SCRIPT`, and write temporary run outputs under `TEMP/generation-quality-runs`. Use Node `.mjs` scripts and `node:test` contract tests so the system can run without backend services or publishing.

**Tech Stack:** Node.js ESM, `node:test`, `assert/strict`, PowerShell commands, JSON manifests, SVG seed samples, static HTML report output.

---

## Scope Guard

This plan intentionally does not implement image-generation algorithm changes.

Do not modify:

- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/styles/mobile-immersive-making.css`
- `perler-beads/src/services/pixelizeService.ts`
- `perler-beads/src/services/colorMatchService.ts`
- `perler-beads/src/data/beadColors.ts`
- Backend files under `perler-beads-server`

Allowed files are listed explicitly in each task.

## File Structure

Create:

- `TEST/generation_quality_manifest_contract.test.mjs` validates sample, matrix, tag, baseline, and bad-case manifests.
- `TEST/generation_quality_run_plan_contract.test.mjs` validates generated run plans and run-id behavior.
- `TEST/generation_quality_compare_contract.test.mjs` validates before/after regression comparison and HTML report generation.
- `TEST/generation-quality/README.md` documents the benchmark directory structure.
- `TEST/generation-quality/manifests/samples.json` defines 16 stable seed samples.
- `TEST/generation-quality/manifests/matrix.phase1a.json` defines the core 96-case matrix.
- `TEST/generation-quality/manifests/quality-tags.json` defines grades, issue tags, and regression states.
- `TEST/generation-quality/samples/<category>/*.svg` stores deterministic seed sample images.
- `TEST/generation-quality/expected/baseline-current/README.md` documents baseline promotion rules.
- `TEST/generation-quality/bad-cases/registry.json` tracks active and resolved bad cases.
- `TEST/generation-quality/fixtures/baseline-summary.json` supplies comparison fixture data.
- `TEST/generation-quality/fixtures/candidate-summary.json` supplies comparison fixture data.
- `SCRIPT/generation_quality_create_samples.mjs` creates deterministic SVG seed samples.
- `SCRIPT/generation_quality_create_run_plan.mjs` expands manifests into a run plan under `TEMP`.
- `SCRIPT/generation_quality_compare_runs.mjs` compares two summaries and writes JSON plus HTML report.
- `MD/client/2026-05-09_generation_quality_phase1a_baseline_system_implementation.md` records the implementation result.

Modify:

- No production source files.

## Task 1: Manifest Contract And Quality Language

**Files:**
- Create: `TEST/generation_quality_manifest_contract.test.mjs`
- Create: `TEST/generation-quality/README.md`
- Create: `TEST/generation-quality/manifests/samples.json`
- Create: `TEST/generation-quality/manifests/matrix.phase1a.json`
- Create: `TEST/generation-quality/manifests/quality-tags.json`

- [ ] **Step 1: Write the failing manifest contract test**

Create `TEST/generation_quality_manifest_contract.test.mjs` with tests that read JSON manifests, verify the 8 categories, verify 16 sample entries, verify the core matrix expands to 96 cases, and verify all quality labels are stable.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = path.join(root, "TEST", "generation-quality");

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(base, relativePath), "utf8"));
}

test("phase1a manifests define 8 categories and 16 stable samples", () => {
  const samples = readJson("manifests/samples.json");
  assert.equal(samples.version, 1);
  assert.equal(samples.samples.length, 16);
  assert.deepEqual(
    [...new Set(samples.samples.map((sample) => sample.category))].sort(),
    [
      "cartoon",
      "complex-photo",
      "high-saturation",
      "light-subject",
      "logo-text",
      "low-resolution",
      "pet",
      "portrait",
    ],
  );
  for (const sample of samples.samples) {
    assert.match(sample.id, /^[a-z0-9-]+_[0-9]{2}_[a-z0-9-]+$/);
    assert.equal(typeof sample.description, "string");
    assert.ok(sample.description.length >= 8);
    assert.ok(Array.isArray(sample.primaryRisks));
    assert.ok(sample.primaryRisks.length >= 1);
    assert.ok(existsSync(path.join(base, sample.file)), `missing sample file: ${sample.file}`);
  }
});

test("phase1a matrix defines the 96-case core run", () => {
  const matrix = readJson("manifests/matrix.phase1a.json");
  assert.equal(matrix.version, 1);
  assert.deepEqual(matrix.paletteModes, ["mard-221", "mard-291", "my-colors"]);
  assert.deepEqual(matrix.simplifyLevels, ["balanced", "strong"]);
  assert.deepEqual(matrix.sizes, [{ width: 54, height: 54 }]);
  assert.equal(16 * matrix.paletteModes.length * matrix.simplifyLevels.length * matrix.sizes.length, 96);
});

test("phase1a quality tags define grades, issues, and regression states", () => {
  const tags = readJson("manifests/quality-tags.json");
  assert.deepEqual(tags.grades.map((item) => item.id), ["pass", "acceptable", "fail"]);
  assert.ok(tags.issueTags.some((item) => item.id === "dirty_colors"));
  assert.ok(tags.issueTags.some((item) => item.id === "inventory_insufficient"));
  assert.deepEqual(tags.regressionStates.map((item) => item.id), ["improved", "unchanged", "regressed", "mixed"]);
});
```

- [ ] **Step 2: Run the contract test and verify it fails because manifests do not exist**

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
```

Expected: FAIL with `ENOENT` for `samples.json`.

- [ ] **Step 3: Create the benchmark README**

Create `TEST/generation-quality/README.md`:

```markdown
# Generation Quality Phase1-A Baseline System

This directory stores stable inputs and manifests for comparing image-to-perler generation quality.

Rules:

- `samples/` stores deterministic seed sample images.
- `manifests/` stores stable JSON definitions.
- `expected/baseline-current/` stores promoted baseline summaries only after review.
- `bad-cases/` stores active and resolved failure cases.
- Generated run outputs belong in `TEMP/generation-quality-runs/`, not in this directory.

Phase1-A does not modify production generation algorithms or making-mode interaction code.
```

- [ ] **Step 4: Create `samples.json` with 16 sample entries**

Create `TEST/generation-quality/manifests/samples.json` with exactly these IDs:

```json
{
  "version": 1,
  "samples": [
    { "id": "portrait_01_girl", "category": "portrait", "file": "samples/portrait/portrait_01_girl.svg", "description": "浅色背景人像头像，验证肤色、头发和五官", "primaryRisks": ["skin_shift", "small_detail_blur", "outline_lost"], "subjectType": "human", "defaultCrop": "subject-centered" },
    { "id": "portrait_02_profile", "category": "portrait", "file": "samples/portrait/portrait_02_profile.svg", "description": "侧脸人像头像，验证脸部边缘和头发区域", "primaryRisks": ["identity_lost", "outline_lost"], "subjectType": "human", "defaultCrop": "subject-centered" },
    { "id": "pet_01_dog", "category": "pet", "file": "samples/pet/pet_01_dog.svg", "description": "小狗头像，验证眼睛、鼻子和浅色毛发", "primaryRisks": ["small_detail_blur", "dirty_colors"], "subjectType": "pet", "defaultCrop": "subject-centered" },
    { "id": "pet_02_cat", "category": "pet", "file": "samples/pet/pet_02_cat.svg", "description": "猫头像，验证深浅毛色和胡须边缘", "primaryRisks": ["outline_lost", "too_fragmented"], "subjectType": "pet", "defaultCrop": "subject-centered" },
    { "id": "cartoon_01_bear", "category": "cartoon", "file": "samples/cartoon/cartoon_01_bear.svg", "description": "卡通小熊，验证黑线和纯色块稳定性", "primaryRisks": ["outline_lost", "over_simplified"], "subjectType": "cartoon", "defaultCrop": "full-image" },
    { "id": "cartoon_02_robot", "category": "cartoon", "file": "samples/cartoon/cartoon_02_robot.svg", "description": "卡通机器人，验证硬边和小区域色块", "primaryRisks": ["too_fragmented", "palette_shift"], "subjectType": "cartoon", "defaultCrop": "full-image" },
    { "id": "complex-photo_01_garden", "category": "complex-photo", "file": "samples/complex-photo/complex-photo_01_garden.svg", "description": "复杂背景花园图，验证背景干扰和碎色", "primaryRisks": ["background_pollution", "dirty_colors"], "subjectType": "scene", "defaultCrop": "full-image" },
    { "id": "complex-photo_02_room", "category": "complex-photo", "file": "samples/complex-photo/complex-photo_02_room.svg", "description": "复杂室内场景，验证低对比区域和背景合并", "primaryRisks": ["dirty_colors", "too_fragmented"], "subjectType": "scene", "defaultCrop": "full-image" },
    { "id": "logo-text_01_pd", "category": "logo-text", "file": "samples/logo-text/logo-text_01_pd.svg", "description": "PD 字母标识，验证文字硬边和可读性", "primaryRisks": ["small_detail_blur", "outline_lost"], "subjectType": "text-logo", "defaultCrop": "full-image" },
    { "id": "logo-text_02_wordmark", "category": "logo-text", "file": "samples/logo-text/logo-text_02_wordmark.svg", "description": "短文字标识，验证细线和小尺寸文字识别", "primaryRisks": ["small_detail_blur", "not_makable"], "subjectType": "text-logo", "defaultCrop": "full-image" },
    { "id": "low-resolution_01_face", "category": "low-resolution", "file": "samples/low-resolution/low-resolution_01_face.svg", "description": "低清人脸输入，验证模糊细节处理", "primaryRisks": ["small_detail_blur", "identity_lost"], "subjectType": "human", "defaultCrop": "subject-centered" },
    { "id": "low-resolution_02_pet", "category": "low-resolution", "file": "samples/low-resolution/low-resolution_02_pet.svg", "description": "低清宠物输入，验证噪点和主体识别", "primaryRisks": ["dirty_colors", "identity_lost"], "subjectType": "pet", "defaultCrop": "subject-centered" },
    { "id": "high-saturation_01_fruit", "category": "high-saturation", "file": "samples/high-saturation/high-saturation_01_fruit.svg", "description": "高饱和水果图，验证强色映射和过冲", "primaryRisks": ["palette_shift", "dirty_colors"], "subjectType": "object", "defaultCrop": "full-image" },
    { "id": "high-saturation_02_toy", "category": "high-saturation", "file": "samples/high-saturation/high-saturation_02_toy.svg", "description": "高饱和玩具图，验证鲜艳颜色和相近色碎裂", "primaryRisks": ["too_fragmented", "palette_shift"], "subjectType": "object", "defaultCrop": "full-image" },
    { "id": "light-subject_01_white-dog", "category": "light-subject", "file": "samples/light-subject/light-subject_01_white-dog.svg", "description": "浅色小狗与浅背景，验证主体边界保护", "primaryRisks": ["outline_lost", "background_pollution"], "subjectType": "pet", "defaultCrop": "subject-centered" },
    { "id": "light-subject_02_pale-flower", "category": "light-subject", "file": "samples/light-subject/light-subject_02_pale-flower.svg", "description": "浅色花朵与浅背景，验证低对比轮廓", "primaryRisks": ["outline_lost", "dirty_colors"], "subjectType": "object", "defaultCrop": "full-image" }
  ]
}
```

- [ ] **Step 5: Create `matrix.phase1a.json`**

```json
{
  "version": 1,
  "name": "phase1a-core",
  "description": "16 samples × 3 palettes × 2 simplify levels × 1 size = 96 core cases",
  "paletteModes": ["mard-221", "mard-291", "my-colors"],
  "simplifyLevels": ["balanced", "strong"],
  "sizes": [{ "width": 54, "height": 54 }],
  "myColorsFixture": {
    "name": "phase1a-basic-inventory",
    "colorIds": ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "C1", "C2", "C3", "D1", "D2", "E1", "E2", "F1", "G1", "H1", "H7", "M4", "M9", "P1", "P4", "R1", "R8"]
  }
}
```

- [ ] **Step 6: Create `quality-tags.json`**

```json
{
  "version": 1,
  "grades": [
    { "id": "pass", "label": "通过", "description": "可以继续制作" },
    { "id": "acceptable", "label": "可接受", "description": "有瑕疵但主体清楚，仍可制作" },
    { "id": "fail", "label": "失败", "description": "不建议制作" }
  ],
  "issueTags": [
    { "id": "identity_lost", "label": "主体不像" },
    { "id": "dirty_colors", "label": "脏色明显" },
    { "id": "outline_lost", "label": "轮廓丢失" },
    { "id": "too_fragmented", "label": "颜色太碎" },
    { "id": "small_detail_blur", "label": "小图细节糊" },
    { "id": "palette_shift", "label": "色板映射偏色" },
    { "id": "inventory_insufficient", "label": "用户库存色不足" },
    { "id": "not_makable", "label": "实际难拼" },
    { "id": "background_pollution", "label": "背景污染主体" },
    { "id": "over_simplified", "label": "简化过度" },
    { "id": "over_detailed", "label": "细节过多" }
  ],
  "regressionStates": [
    { "id": "improved", "label": "提升" },
    { "id": "unchanged", "label": "持平" },
    { "id": "regressed", "label": "退化" },
    { "id": "mixed", "label": "混合变化" }
  ]
}
```

- [ ] **Step 7: Run the manifest contract test and verify it still fails because sample SVGs are missing**

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
```

Expected: FAIL with `missing sample file`.

- [ ] **Step 8: Commit Task 1**

```powershell
git add -- TEST/generation_quality_manifest_contract.test.mjs TEST/generation-quality/README.md TEST/generation-quality/manifests/samples.json TEST/generation-quality/manifests/matrix.phase1a.json TEST/generation-quality/manifests/quality-tags.json
git commit -m "test: define generation quality phase1a manifests"
```

## Task 2: Deterministic Seed Samples

**Files:**
- Create: `SCRIPT/generation_quality_create_samples.mjs`
- Create: `TEST/generation-quality/samples/portrait/*.svg`
- Create: `TEST/generation-quality/samples/pet/*.svg`
- Create: `TEST/generation-quality/samples/cartoon/*.svg`
- Create: `TEST/generation-quality/samples/complex-photo/*.svg`
- Create: `TEST/generation-quality/samples/logo-text/*.svg`
- Create: `TEST/generation-quality/samples/low-resolution/*.svg`
- Create: `TEST/generation-quality/samples/high-saturation/*.svg`
- Create: `TEST/generation-quality/samples/light-subject/*.svg`

- [ ] **Step 1: Create the seed sample generator**

Create `SCRIPT/generation_quality_create_samples.mjs`. The script reads `samples.json`, creates the eight category directories, and writes deterministic SVG files for each sample ID. Each SVG must be 256×256 and contain distinct shapes matching the sample category.

Key implementation shape:

```js
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = path.join(root, "TEST", "generation-quality");
const manifest = JSON.parse(readFileSync(path.join(base, "manifests", "samples.json"), "utf8"));

function svgFor(sample) {
  const label = sample.id.replaceAll("_", " ");
  const palette = {
    portrait: ["#ffe2c8", "#4a2b22", "#f7b5c8"],
    pet: ["#f7f0dc", "#3b2f2f", "#c48a5a"],
    cartoon: ["#f8d65a", "#101010", "#5bc0eb"],
    "complex-photo": ["#5c7a42", "#d9b26f", "#6a8caf"],
    "logo-text": ["#ff5b5b", "#111111", "#ffffff"],
    "low-resolution": ["#d9b38c", "#6d4c41", "#c9c9c9"],
    "high-saturation": ["#ff004d", "#00d1ff", "#ffe600"],
    "light-subject": ["#fff8ee", "#e9edf2", "#b8c3cc"]
  }[sample.category];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${palette[2]}"/>
  <circle cx="128" cy="112" r="72" fill="${palette[0]}" stroke="#222" stroke-width="8"/>
  <circle cx="98" cy="104" r="10" fill="#111"/>
  <circle cx="158" cy="104" r="10" fill="#111"/>
  <path d="M96 156 Q128 184 160 156" fill="none" stroke="${palette[1]}" stroke-width="8" stroke-linecap="round"/>
  <rect x="46" y="198" width="164" height="28" rx="8" fill="#ffffff" opacity="0.72"/>
  <text x="128" y="218" text-anchor="middle" font-family="Arial" font-size="14" fill="#111">${label}</text>
</svg>
`;
}

for (const sample of manifest.samples) {
  const outputPath = path.join(base, sample.file);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, svgFor(sample), "utf8");
}
```

- [ ] **Step 2: Run the sample generator**

Run:

```powershell
node SCRIPT\generation_quality_create_samples.mjs
```

Expected: creates 16 SVG files under `TEST\generation-quality\samples`.

- [ ] **Step 3: Run the manifest contract test**

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit Task 2**

```powershell
git add -- SCRIPT/generation_quality_create_samples.mjs TEST/generation-quality/samples
git commit -m "test: add generation quality seed samples"
```

## Task 3: Run Plan Generator

**Files:**
- Create: `TEST/generation_quality_run_plan_contract.test.mjs`
- Create: `SCRIPT/generation_quality_create_run_plan.mjs`

- [ ] **Step 1: Write the failing run-plan contract test**

Create `TEST/generation_quality_run_plan_contract.test.mjs`.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const runId = "phase1a-contract-run";
const runDir = path.join(root, "TEMP", "generation-quality-runs", runId);

test("create run plan expands phase1a core matrix to 96 cases", () => {
  rmSync(runDir, { recursive: true, force: true });
  const result = spawnSync(process.execPath, [
    "SCRIPT/generation_quality_create_run_plan.mjs",
    "--run-id",
    runId,
    "--matrix",
    "phase1a"
  ], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(path.join(runDir, "run-plan.json")));
  assert.ok(existsSync(path.join(runDir, "summary.json")));

  const plan = JSON.parse(readFileSync(path.join(runDir, "run-plan.json"), "utf8"));
  assert.equal(plan.runId, runId);
  assert.equal(plan.cases.length, 96);
  assert.equal(new Set(plan.cases.map((item) => item.caseId)).size, 96);
  assert.ok(plan.cases.every((item) => item.output.image.endsWith(".png")));
});
```

- [ ] **Step 2: Run the test and verify it fails because the script does not exist**

Run:

```powershell
node TEST\generation_quality_run_plan_contract.test.mjs
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement the run-plan generator**

Create `SCRIPT/generation_quality_create_run_plan.mjs`. It must:

- Read `samples.json`.
- Read `matrix.phase1a.json`.
- Build 96 case records.
- Create `TEMP/generation-quality-runs/<run-id>/`.
- Write `run-plan.json`.
- Write `summary.json` with zero completed cases.
- Not call any generation algorithm.

Use this case ID format:

```text
<sampleId>__<paletteMode>__<simplifyLevel>__<width>x<height>
```

Use this case output shape:

```json
{
  "caseId": "portrait_01_girl__mard-221__balanced__54x54",
  "sampleId": "portrait_01_girl",
  "input": { "file": "TEST/generation-quality/samples/portrait/portrait_01_girl.svg" },
  "params": {
    "paletteMode": "mard-221",
    "simplifyLevel": "balanced",
    "size": { "width": 54, "height": 54 }
  },
  "output": {
    "image": "outputs/portrait_01_girl__mard-221__balanced__54x54.png",
    "metadata": "metadata/portrait_01_girl__mard-221__balanced__54x54.json"
  }
}
```

- [ ] **Step 4: Run the run-plan contract test**

Run:

```powershell
node TEST\generation_quality_run_plan_contract.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- TEST/generation_quality_run_plan_contract.test.mjs SCRIPT/generation_quality_create_run_plan.mjs
git commit -m "test: add generation quality run plan generator"
```

## Task 4: Result Metadata And Baseline Fixtures

**Files:**
- Modify: `TEST/generation_quality_manifest_contract.test.mjs`
- Create: `TEST/generation-quality/fixtures/baseline-summary.json`
- Create: `TEST/generation-quality/fixtures/candidate-summary.json`
- Create: `TEST/generation-quality/expected/baseline-current/README.md`

- [ ] **Step 1: Extend manifest contract test for summary fixtures**

Add a test that validates both fixture summaries contain `runId`, `commit`, `matrixName`, `totals`, and `results`.

```js
test("summary fixtures use stable quality result structure", () => {
  for (const name of ["baseline-summary.json", "candidate-summary.json"]) {
    const summary = JSON.parse(readFileSync(path.join(base, "fixtures", name), "utf8"));
    assert.equal(typeof summary.runId, "string");
    assert.equal(typeof summary.commit, "string");
    assert.equal(summary.matrixName, "phase1a-core");
    assert.equal(typeof summary.totals.totalCases, "number");
    assert.ok(Array.isArray(summary.results));
    for (const item of summary.results) {
      assert.equal(typeof item.caseId, "string");
      assert.ok(["pass", "acceptable", "fail"].includes(item.qualityGrade));
      assert.ok(Array.isArray(item.issueTags));
    }
  }
});
```

- [ ] **Step 2: Run test and verify it fails because fixtures do not exist**

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
```

Expected: FAIL with `ENOENT` for fixture files.

- [ ] **Step 3: Create baseline and candidate fixture summaries**

Create `TEST/generation-quality/fixtures/baseline-summary.json` with 4 representative cases:

```json
{
  "runId": "baseline-fixture",
  "commit": "5712705c",
  "matrixName": "phase1a-core",
  "totals": { "totalCases": 4, "pass": 1, "acceptable": 2, "fail": 1 },
  "results": [
    { "caseId": "portrait_01_girl__mard-221__balanced__54x54", "sampleId": "portrait_01_girl", "qualityGrade": "acceptable", "issueTags": ["small_detail_blur"], "actualColorCount": 42 },
    { "caseId": "pet_01_dog__mard-221__balanced__54x54", "sampleId": "pet_01_dog", "qualityGrade": "fail", "issueTags": ["dirty_colors"], "actualColorCount": 55 },
    { "caseId": "cartoon_01_bear__mard-221__balanced__54x54", "sampleId": "cartoon_01_bear", "qualityGrade": "pass", "issueTags": [], "actualColorCount": 18 },
    { "caseId": "logo-text_01_pd__mard-221__balanced__54x54", "sampleId": "logo-text_01_pd", "qualityGrade": "acceptable", "issueTags": ["outline_lost"], "actualColorCount": 12 }
  ]
}
```

Create `TEST/generation-quality/fixtures/candidate-summary.json`:

```json
{
  "runId": "candidate-fixture",
  "commit": "candidate",
  "matrixName": "phase1a-core",
  "totals": { "totalCases": 4, "pass": 2, "acceptable": 2, "fail": 0 },
  "results": [
    { "caseId": "portrait_01_girl__mard-221__balanced__54x54", "sampleId": "portrait_01_girl", "qualityGrade": "acceptable", "issueTags": ["small_detail_blur"], "actualColorCount": 40 },
    { "caseId": "pet_01_dog__mard-221__balanced__54x54", "sampleId": "pet_01_dog", "qualityGrade": "acceptable", "issueTags": [], "actualColorCount": 44 },
    { "caseId": "cartoon_01_bear__mard-221__balanced__54x54", "sampleId": "cartoon_01_bear", "qualityGrade": "pass", "issueTags": [], "actualColorCount": 18 },
    { "caseId": "logo-text_01_pd__mard-221__balanced__54x54", "sampleId": "logo-text_01_pd", "qualityGrade": "pass", "issueTags": [], "actualColorCount": 12 }
  ]
}
```

- [ ] **Step 4: Create baseline-current README**

Create `TEST/generation-quality/expected/baseline-current/README.md`:

```markdown
# Baseline Current

This directory stores promoted generation-quality baseline summaries after review.

Rules:

- Generated run outputs start in `TEMP/generation-quality-runs/`.
- A summary may be copied here only after review.
- Image outputs are not promoted by default.
- A promoted baseline must include run id, commit hash, matrix name, totals, and result records.
- Baseline promotion must not modify production generation or making-mode code.
```

- [ ] **Step 5: Run manifest contract test**

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```powershell
git add -- TEST/generation_quality_manifest_contract.test.mjs TEST/generation-quality/fixtures TEST/generation-quality/expected/baseline-current/README.md
git commit -m "test: add generation quality result fixtures"
```

## Task 5: Before/After Comparison Report

**Files:**
- Create: `TEST/generation_quality_compare_contract.test.mjs`
- Create: `SCRIPT/generation_quality_compare_runs.mjs`

- [ ] **Step 1: Write failing comparison contract test**

Create `TEST/generation_quality_compare_contract.test.mjs`.

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const outputDir = path.join(root, "TEMP", "generation-quality-runs", "compare-fixture");

test("compare script writes regression JSON and HTML report", () => {
  rmSync(outputDir, { recursive: true, force: true });
  const result = spawnSync(process.execPath, [
    "SCRIPT/generation_quality_compare_runs.mjs",
    "--baseline",
    "TEST/generation-quality/fixtures/baseline-summary.json",
    "--candidate",
    "TEST/generation-quality/fixtures/candidate-summary.json",
    "--out",
    outputDir
  ], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(path.join(outputDir, "comparison.json")));
  assert.ok(existsSync(path.join(outputDir, "report.html")));

  const comparison = JSON.parse(readFileSync(path.join(outputDir, "comparison.json"), "utf8"));
  assert.equal(comparison.totals.regressed, 0);
  assert.equal(comparison.totals.improved, 2);
  assert.equal(comparison.decision, "accept");

  const html = readFileSync(path.join(outputDir, "report.html"), "utf8");
  assert.match(html, /Generation Quality Comparison/);
  assert.match(html, /portrait_01_girl/);
  assert.match(html, /pet_01_dog/);
});
```

- [ ] **Step 2: Run the test and verify it fails because compare script does not exist**

Run:

```powershell
node TEST\generation_quality_compare_contract.test.mjs
```

Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Implement the comparison script**

Create `SCRIPT/generation_quality_compare_runs.mjs`. It must:

- Read baseline summary.
- Read candidate summary.
- Compare by `caseId`.
- Map grade score: `fail = 0`, `acceptable = 1`, `pass = 2`.
- Mark each case as `improved`, `unchanged`, `regressed`, or `mixed`.
- Reject if any case regresses.
- Reject if candidate `fail` count is greater than baseline `fail` count.
- Write `comparison.json`.
- Write static `report.html`.

Decision logic:

```js
function gradeScore(grade) {
  return { fail: 0, acceptable: 1, pass: 2 }[grade] ?? -1;
}

function decide(totals, baselineFailCount, candidateFailCount) {
  if (totals.regressed > 0) return "reject";
  if (candidateFailCount > baselineFailCount) return "reject";
  return "accept";
}
```

- [ ] **Step 4: Run comparison contract test**

Run:

```powershell
node TEST\generation_quality_compare_contract.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```powershell
git add -- TEST/generation_quality_compare_contract.test.mjs SCRIPT/generation_quality_compare_runs.mjs
git commit -m "test: add generation quality comparison report"
```

## Task 6: Bad Cases Registry

**Files:**
- Modify: `TEST/generation_quality_manifest_contract.test.mjs`
- Create: `TEST/generation-quality/bad-cases/registry.json`

- [ ] **Step 1: Extend manifest contract test for bad-case registry**

Add this test:

```js
test("bad case registry has stable tracking fields", () => {
  const registry = readJson("bad-cases/registry.json");
  assert.equal(registry.version, 1);
  assert.ok(Array.isArray(registry.cases));
  for (const item of registry.cases) {
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.sourceSampleId, "string");
    assert.ok(["active", "resolved", "watching"].includes(item.status));
    assert.ok(Array.isArray(item.issueTags));
    assert.equal(typeof item.firstSeenRunId, "string");
    assert.equal(typeof item.notes, "string");
  }
});
```

- [ ] **Step 2: Run test and verify it fails because registry is missing**

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
```

Expected: FAIL with `ENOENT` for `bad-cases/registry.json`.

- [ ] **Step 3: Create bad-case registry**

Create `TEST/generation-quality/bad-cases/registry.json`:

```json
{
  "version": 1,
  "cases": [
    {
      "id": "badcase_001_dirty_light_subject",
      "sourceSampleId": "light-subject_01_white-dog",
      "status": "watching",
      "issueTags": ["outline_lost", "background_pollution"],
      "firstSeenRunId": "seed-definition",
      "notes": "浅色主体和浅色背景是轮廓保护高风险样张，首轮作为观察用例。"
    }
  ]
}
```

- [ ] **Step 4: Run manifest contract test**

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

```powershell
git add -- TEST/generation_quality_manifest_contract.test.mjs TEST/generation-quality/bad-cases/registry.json
git commit -m "test: add generation quality bad case registry"
```

## Task 7: Documentation Record And Verification

**Files:**
- Create: `MD/client/2026-05-09_generation_quality_phase1a_baseline_system_implementation.md`

- [ ] **Step 1: Create implementation record MD**

Create `MD/client/2026-05-09_generation_quality_phase1a_baseline_system_implementation.md`:

```markdown
# 生成质量优化 Phase1-A 质量基准系统落地记录

## 范围

本次只落地质量基准系统基础设施，不改生成算法、不改制作模式、不发布正式域名。

## 已落地能力

- 固定样张集结构。
- 样张命名与分类规则。
- Phase1-A 核心测试矩阵。
- 结果输出结构。
- 参数记录格式。
- 质量标签结构。
- before/after 对比输出方案。
- 回归比较流程。
- baseline 结果归档规则。
- bad cases 管理规则。

## 不变量

- 不修改手机端单板沉浸式制作交互。
- 不修改 `MakingPage.tsx`。
- 不修改核心生成算法。
- 不进入模板、社区、作品平台化扩展。

## 验证命令

- `node TEST\generation_quality_manifest_contract.test.mjs`
- `node TEST\generation_quality_run_plan_contract.test.mjs`
- `node TEST\generation_quality_compare_contract.test.mjs`
```

- [ ] **Step 2: Run all Phase1-A tests**

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
node TEST\generation_quality_run_plan_contract.test.mjs
node TEST\generation_quality_compare_contract.test.mjs
```

Expected: all PASS.

- [ ] **Step 3: Verify production source files were not touched**

Run:

```powershell
git diff --name-only -- perler-beads/src/pages/mobile/MakingPage.tsx perler-beads/src/styles/mobile-immersive-making.css perler-beads/src/services/pixelizeService.ts perler-beads/src/services/colorMatchService.ts perler-beads/src/data/beadColors.ts
```

Expected: no output.

- [ ] **Step 4: Verify final changed files are only Phase1-A infrastructure and MD record**

Run:

```powershell
git status --short -- TEST/generation_quality_manifest_contract.test.mjs TEST/generation_quality_run_plan_contract.test.mjs TEST/generation_quality_compare_contract.test.mjs TEST/generation-quality SCRIPT/generation_quality_create_samples.mjs SCRIPT/generation_quality_create_run_plan.mjs SCRIPT/generation_quality_compare_runs.mjs MD/client/2026-05-09_generation_quality_phase1a_baseline_system_implementation.md
```

Expected: only Phase1-A files appear.

- [ ] **Step 5: Commit Task 7**

```powershell
git add -- MD/client/2026-05-09_generation_quality_phase1a_baseline_system_implementation.md
git commit -m "docs: record generation quality phase1a baseline system"
```

## Final Verification

Run:

```powershell
node TEST\generation_quality_manifest_contract.test.mjs
node TEST\generation_quality_run_plan_contract.test.mjs
node TEST\generation_quality_compare_contract.test.mjs
git log -7 --oneline
```

Expected:

- All three tests pass.
- The latest commits correspond to the seven tasks in this plan.
- No production making-mode or generation algorithm file appears in the Phase1-A diffs.

