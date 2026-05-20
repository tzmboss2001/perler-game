# Photo Progress Sync Phase1-A/B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立“拍照同步进度”的最小识别闭环：先完成格级进度数据结构与转换纯函数，再完成单板静态照片上传、四角校准、空孔参考、识别预览。

**Architecture:** Phase1-A 先做纯函数和测试，所有 AI/视觉判断结果都转换成可审计的 preview model，持久化只允许保存用户确认过的完成格。Phase1-B 新增独立上传弹层，不复用实时摄像头弹层 UI，不写入真实制作进度，只验证上传照片到识别预览的闭环。

**Tech Stack:** React 19、Vite、TypeScript/JavaScript mixed source、Node test、现有 `visionAssistService.ts`、MCP Chrome DevTools。

---

## 0. Scope
本计划只覆盖 Phase1-A 和 Phase1-B。

进入本轮：
- 数据结构与转换纯函数。
- confidence / qualityLevel 规则。
- 低可信区域可视化模型。
- 合成样张测试方案。
- 静态照片识别弹层。
- 四角校准 UI。
- 空孔参考色取样。
- 识别预览。

不进入本轮：
- 用户确认后保存进度。
- 制作页完成遮罩。
- 云同步。
- 多板自动保存。
- 自动纠错。
- 实时摄像头。
- 修改手机端单板沉浸式手势、缩放、拖动边界、切板、复位逻辑。

## 1. File Map
Phase1-A:
- Create: `perler-beads/src/services/photoProgressService.js`
- Modify: `perler-beads/src/services/visionAssistService.ts`
- Create: `TEST/photo_progress_service.test.mjs`
- Create: `TEST/photo_progress_vision_contract.test.mjs`
- Modify: `MD/client/2026-05-19_photo_progress_sync_phase1_design.md`
- Create: `MD/client/YYYY-MM-DD_photo_progress_sync_phase1a_result.md`

Phase1-B:
- Create: `perler-beads/src/components/PhotoProgressSyncModal.tsx`
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Create: `TEST/photo_progress_modal_contract.test.mjs`
- Create: `TEST/photo_progress_synthetic_fixture.mjs`
- Create: `MD/client/YYYY-MM-DD_photo_progress_sync_phase1b_result.md`

## 2. Minimal Recognition Flow
Phase1-B 的最小流程固定为：
1. 用户在单板制作模式的工具抽屉点击 `拍照同步`。
2. 弹层打开，底层画布冻结。
3. 用户上传或拍摄一张照片。
4. 系统显示照片预览。
5. 用户确认当前板，默认是 `activeBoardNumber`。
6. 用户点四个角：左上、右上、右下、左下。
7. 用户点击一个空孔作为空板参考色。
8. 系统调用 `analyzeVisionProgress()`。
9. 系统把结果转换为 preview model。
10. 弹层展示 `候选完成 / 疑似错误 / 低可信 / 未完成`。
11. 用户可以关闭、重新校准、重新上传。

本轮不出现 `确认同步进度` 主操作，避免用户误以为已经能保存。

## 3. Corner Calibration UI Sketch
手机弹层布局草图：

```text
┌────────────────────────────┐
│ 拍照同步进度（试验）        × │
├────────────────────────────┤
│ 当前板：板 3     [切换板]    │
│ 提示：请点击拼豆板左上角      │
├────────────────────────────┤
│                            │
│        上传照片预览          │
│   ● 左上   ○ 右上           │
│                            │
│   ○ 左下   ○ 右下           │
│                            │
├────────────────────────────┤
│ [重新上传] [撤销点位] [下一步] │
└────────────────────────────┘
```

四角完成后进入空孔参考：

```text
┌────────────────────────────┐
│ 提示：点击一个还没放豆的空孔  │
│ 照片预览 + 四角框线           │
│ 被点击空孔显示蓝色取样圈       │
│ [重新校准] [开始识别]          │
└────────────────────────────┘
```

识别结果预览：

```text
┌────────────────────────────┐
│ 识别预览：候选完成 320 格     │
│ 疑似错误 3 · 低可信 12        │
│ 质量：warning，建议人工确认    │
├────────────────────────────┤
│ 图纸网格预览                  │
│ 绿色/灰：候选完成             │
│ 红框：疑似错误                │
│ 黄点/斜纹：低可信             │
├────────────────────────────┤
│ [重新校准] [重新上传] [关闭]   │
└────────────────────────────┘
```

## 4. Confidence And Quality Rules
preview model 的规则：
- `matched + quality good/warning + detectedDistance <= 70` -> `done_candidate`
- `wrong` -> `suspected_wrong`
- `missing` or `empty` -> `pending`
- `extra` on non-target area -> `low_confidence`
- `quality.level === "poor"` -> 所有 `done_candidate` 降级为 `low_confidence`
- `quality.issues.length > 0` -> 给对应 cell 加 `confidenceReasons`
- 没有空孔参考色 -> 整体 `qualityLevel` 强制为 `poor`

confidence 建议：
- `done_candidate` 且质量 good：`0.9`
- `done_candidate` 且质量 warning：`0.75`
- `suspected_wrong`：`0.7`
- `low_confidence`：`0.35`
- `pending`：`0.5`

这些数值只用于 Phase1 预览和测试，不进入最终进度保存。

## 5. Synthetic Fixture Plan
合成样张生成器放在 `TEST/photo_progress_synthetic_fixture.mjs`，用 canvas 或纯像素矩阵生成固定输入。第一批样张：
- `perfect_4x4`: 全部正确，期望 16 个 `done_candidate`。
- `missing_4x4`: 4 个空孔，期望 12 个 `done_candidate`、4 个 `pending`。
- `wrong_4x4`: 2 个错色，期望 14 个 `done_candidate`、2 个 `suspected_wrong`。
- `low_quality_4x4`: 模拟 poor quality，期望 0 个可保存候选完成，全部完成候选降级为 `low_confidence`。
- `edge_partial_4x4`: 边缘残板含 null target，期望 null target 不计入完成候选。

## 6. Task 1: Phase1-A Pure Model
**Files:**
- Create: `perler-beads/src/services/photoProgressService.js`
- Create: `TEST/photo_progress_service.test.mjs`

- [ ] **Step 1: Write failing tests for conversion rules**

Create `TEST/photo_progress_service.test.mjs` with:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createPhotoProgressPreview,
  confirmPhotoProgressPreview,
  createPhotoProgressStorageKey,
} from "../perler-beads/src/services/photoProgressService.js";

const cell = (overrides) => ({
  index: 0,
  x: 0,
  y: 0,
  target: { id: "A1", hex: "#111111" },
  detectedColor: { id: "A1", hex: "#111111" },
  detectedDistance: 24,
  state: "matched",
  sample: [17, 17, 17],
  center: { x: 5, y: 5 },
  ...overrides,
});

const detection = (overrides = {}) => ({
  totalTargetCells: 4,
  matchedCells: 1,
  missingCells: 1,
  wrongCells: 1,
  extraFilledCells: 0,
  progress: 0.25,
  activeColorId: "A1",
  activeColorMatched: 1,
  activeColorRemaining: 0,
  colors: [],
  guideCells: [],
  matchedGuideCells: [],
  wrongGuideCells: [],
  wrongCellsDetail: [],
  wrongColorSuggestions: [],
  markerRadius: 4,
  quality: { level: "good", brightness: 128, tint: 0, glareRatio: 0, issues: [] },
  detectedCells: [
    cell({ index: 0, x: 0, y: 0, state: "matched", detectedDistance: 24 }),
    cell({ index: 1, x: 1, y: 0, state: "missing", detectedColor: null, detectedDistance: null }),
    cell({ index: 2, x: 0, y: 1, state: "wrong", detectedColor: { id: "B2", hex: "#222222" }, detectedDistance: 40 }),
    cell({ index: 3, x: 1, y: 1, state: "matched", detectedDistance: 92 }),
  ],
  ...overrides,
});

test("photo progress preview classifies matched, pending, wrong, and low confidence cells", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 2,
    usedWidth: 2,
    usedHeight: 2,
    detection: detection(),
    createdAt: 1710000000000,
  });

  assert.equal(preview.summary.doneCandidateCount, 1);
  assert.equal(preview.summary.pendingCount, 1);
  assert.equal(preview.summary.suspectedWrongCount, 1);
  assert.equal(preview.summary.lowConfidenceCount, 1);
});

test("poor quality downgrades done candidates to low confidence", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 2,
    usedWidth: 2,
    usedHeight: 2,
    detection: detection({
      quality: { level: "poor", brightness: 245, tint: 30, glareRatio: 0.3, issues: ["反光明显"] },
    }),
    createdAt: 1710000000000,
  });

  assert.equal(preview.summary.doneCandidateCount, 0);
  assert.equal(preview.summary.lowConfidenceCount, 2);
});

test("confirmed snapshot only persists selected done candidates", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 2,
    usedWidth: 2,
    usedHeight: 2,
    detection: detection(),
    createdAt: 1710000000000,
  });

  const snapshot = confirmPhotoProgressPreview({
    preview,
    confirmedCellIndexes: [0],
    confirmedAt: 1710000001000,
  });

  assert.equal(snapshot.completedCount, 1);
  assert.deepEqual(snapshot.confirmedCells.map((item) => item.index), [0]);
  assert.equal(snapshot.suspectedWrongCount, 1);
  assert.equal(snapshot.lowConfidenceCount, 1);
});

test("storage key isolates project and bead data hash", () => {
  assert.equal(
    createPhotoProgressStorageKey({ projectId: 42, beadDataHash: "abc" }),
    "photo-progress:v1:42:abc",
  );
});
```

Run:

```powershell
node TEST\photo_progress_service.test.mjs
```

Expected: FAIL because `photoProgressService.js` does not exist.

- [ ] **Step 2: Implement minimal pure service**

Create `perler-beads/src/services/photoProgressService.js`:

```js
const DONE_DISTANCE_THRESHOLD = 70;

const getConfidenceForState = ({ state, qualityLevel }) => {
  if (state === "done_candidate") {
    return qualityLevel === "good" ? 0.9 : 0.75;
  }
  if (state === "suspected_wrong") return 0.7;
  if (state === "low_confidence") return 0.35;
  return 0.5;
};

const getPreviewState = ({ cell, qualityLevel }) => {
  if (qualityLevel === "poor" && cell.state === "matched") {
    return "low_confidence";
  }
  if (cell.state === "matched") {
    return cell.detectedDistance !== null && cell.detectedDistance <= DONE_DISTANCE_THRESHOLD
      ? "done_candidate"
      : "low_confidence";
  }
  if (cell.state === "wrong") return "suspected_wrong";
  if (cell.state === "missing" || cell.state === "empty") return "pending";
  return "low_confidence";
};

const getConfidenceReasons = ({ cell, quality }) => {
  const reasons = [];
  if (quality.level === "poor") reasons.push("quality_poor");
  if (quality.glareRatio >= 0.12) reasons.push("glare");
  if (cell.detectedDistance !== null && cell.detectedDistance > DONE_DISTANCE_THRESHOLD) {
    reasons.push("color_distance_high");
  }
  for (const issue of quality.issues || []) {
    reasons.push(issue);
  }
  return reasons;
};

export const createPhotoProgressPreview = ({
  boardNumber,
  boardSize,
  usedWidth,
  usedHeight,
  detection,
  createdAt,
}) => {
  const quality = detection.quality || { level: "poor", issues: [], glareRatio: 0 };
  const cells = (detection.detectedCells || [])
    .filter((cell) => Boolean(cell.target))
    .map((cell) => {
      const state = getPreviewState({ cell, qualityLevel: quality.level });
      return {
        x: cell.x,
        y: cell.y,
        index: cell.index,
        state,
        confidence: getConfidenceForState({ state, qualityLevel: quality.level }),
        targetColorId: cell.target?.id || null,
        detectedColorId: cell.detectedColor?.id || null,
        confidenceReasons: getConfidenceReasons({ cell, quality }),
      };
    });

  const count = (state) => cells.filter((cell) => cell.state === state).length;

  return {
    version: 1,
    boardNumber,
    boardSize,
    usedWidth,
    usedHeight,
    source: "photo_upload",
    createdAt,
    qualityLevel: quality.level,
    qualityIssues: quality.issues || [],
    cells,
    summary: {
      doneCandidateCount: count("done_candidate"),
      suspectedWrongCount: count("suspected_wrong"),
      lowConfidenceCount: count("low_confidence"),
      pendingCount: count("pending"),
    },
  };
};

export const confirmPhotoProgressPreview = ({
  preview,
  confirmedCellIndexes,
  confirmedAt,
}) => {
  const confirmedSet = new Set(confirmedCellIndexes);
  const confirmedCells = preview.cells
    .filter((cell) => cell.state === "done_candidate" && confirmedSet.has(cell.index))
    .map((cell) => ({
      x: cell.x,
      y: cell.y,
      index: cell.index,
      targetColorId: cell.targetColorId,
      confidence: cell.confidence,
      confirmedAt,
      source: "photo_upload",
    }));

  return {
    version: 1,
    boardNumber: preview.boardNumber,
    boardSize: preview.boardSize,
    usedWidth: preview.usedWidth,
    usedHeight: preview.usedHeight,
    source: "photo_upload",
    createdAt: preview.createdAt,
    confirmedAt,
    qualityLevel: preview.qualityLevel,
    completedCount: confirmedCells.length,
    suspectedWrongCount: preview.summary.suspectedWrongCount,
    lowConfidenceCount: preview.summary.lowConfidenceCount,
    confirmedCells,
  };
};

export const createPhotoProgressStorageKey = ({ projectId, beadDataHash }) =>
  `photo-progress:v1:${projectId}:${beadDataHash}`;
```

- [ ] **Step 3: Run pure service tests**

Run:

```powershell
node TEST\photo_progress_service.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit Phase1-A pure model**

```powershell
git add perler-beads/src/services/photoProgressService.js TEST/photo_progress_service.test.mjs
git commit -m "feat: add photo progress preview model"
```

## 7. Task 2: Expose Full Detected Cells From Vision Service
**Files:**
- Modify: `perler-beads/src/services/visionAssistService.ts`
- Create: `TEST/photo_progress_vision_contract.test.mjs`

- [ ] **Step 1: Write failing contract test**

Create `TEST/photo_progress_vision_contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const visionPath = new URL("../perler-beads/src/services/visionAssistService.ts", import.meta.url);
const source = readFileSync(visionPath, "utf8");

test("vision detection result exposes all detected cells for photo progress preview", () => {
  assert.match(source, /detectedCells:\s*VisionDetectedCell\[\]/);
  assert.match(source, /detectedCells:\s*cells/);
});
```

Run:

```powershell
node TEST\photo_progress_vision_contract.test.mjs
```

Expected: FAIL because `detectedCells` is not exposed yet.

- [ ] **Step 2: Add compatible detectedCells field**

Modify `perler-beads/src/services/visionAssistService.ts`:

```ts
export interface VisionDetectionResult {
  totalTargetCells: number;
  matchedCells: number;
  missingCells: number;
  wrongCells: number;
  extraFilledCells: number;
  progress: number;
  activeColorId: string | null;
  activeColorMatched: number;
  activeColorRemaining: number;
  colors: VisionColorProgress[];
  guideCells: VisionDetectedCell[];
  matchedGuideCells: VisionDetectedCell[];
  wrongGuideCells: VisionDetectedCell[];
  wrongCellsDetail: VisionDetectedCell[];
  detectedCells: VisionDetectedCell[];
  wrongColorSuggestions: VisionWrongColorSuggestion[];
  quality: VisionDetectionQuality;
  markerRadius: number;
}
```

In the `analyzeVisionProgress()` return object, add:

```ts
detectedCells: cells,
```

This is additive and should not change existing visual assist behavior.

- [ ] **Step 3: Run vision contract and pure model tests**

```powershell
node TEST\photo_progress_vision_contract.test.mjs
node TEST\photo_progress_service.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Build**

```powershell
Push-Location perler-beads
npm run build
Pop-Location
```

Expected: PASS, existing Vite chunk-size warning is acceptable.

- [ ] **Step 5: Commit detectedCells compatibility field**

```powershell
git add perler-beads/src/services/visionAssistService.ts TEST/photo_progress_vision_contract.test.mjs
git commit -m "feat: expose detected cells for photo progress"
```

## 8. Task 3: Phase1-B Static Photo Modal Contract
**Files:**
- Create: `perler-beads/src/components/PhotoProgressSyncModal.tsx`
- Create: `TEST/photo_progress_modal_contract.test.mjs`

- [ ] **Step 1: Write modal contract test**

Create `TEST/photo_progress_modal_contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const modalPath = new URL("../perler-beads/src/components/PhotoProgressSyncModal.tsx", import.meta.url);
const makingPath = new URL("../perler-beads/src/pages/mobile/MakingPage.tsx", import.meta.url);

const read = (path) => readFileSync(path, "utf8");

test("photo progress modal exposes upload, corner, empty reference, and preview states", () => {
  const source = read(modalPath);
  assert.match(source, /type PhotoProgressSyncStep/);
  assert.match(source, /"upload"/);
  assert.match(source, /"corners"/);
  assert.match(source, /"empty-reference"/);
  assert.match(source, /"preview"/);
  assert.match(source, /createPhotoProgressPreview/);
  assert.match(source, /analyzeVisionProgress/);
});

test("photo progress modal keeps bottom canvas frozen through an overlay-only modal", () => {
  const source = read(modalPath);
  assert.match(source, /position:\s*"fixed"/);
  assert.match(source, /zIndex/);
  assert.doesNotMatch(source, /position:\s*"static"/);
});

test("making page has a photo sync entry without replacing vision assist", () => {
  const source = read(makingPath);
  assert.match(source, /PhotoProgressSyncModal/);
  assert.match(source, /showPhotoProgressSync/);
  assert.match(source, /拍照同步/);
  assert.match(source, /setShowVisionAssist\(true\)/);
});
```

Run:

```powershell
node TEST\photo_progress_modal_contract.test.mjs
```

Expected: FAIL because the modal and wiring do not exist.

- [ ] **Step 2: Create modal skeleton**

Create `perler-beads/src/components/PhotoProgressSyncModal.tsx` with:

```tsx
import React, { useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import { BeadPixelData } from "../services/colorMatchService";
import {
  VisionPoint,
  VisionRgb,
  analyzeVisionProgress,
  splitBeadDataIntoBoards,
} from "../services/visionAssistService";
import { createPhotoProgressPreview } from "../services/photoProgressService.js";

type PhotoProgressSyncStep =
  | "upload"
  | "corners"
  | "empty-reference"
  | "preview";

interface PhotoProgressSyncModalProps {
  visible: boolean;
  onClose: () => void;
  beadData: BeadPixelData;
  boardSize: number;
  initialBoardIndex: number;
}

const CORNER_LABELS = ["左上角", "右上角", "右下角", "左下角"];

export default function PhotoProgressSyncModal({
  visible,
  onClose,
  beadData,
  boardSize,
  initialBoardIndex,
}: PhotoProgressSyncModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [step, setStep] = useState<PhotoProgressSyncStep>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [corners, setCorners] = useState<VisionPoint[]>([]);
  const [emptyReferenceRgb, setEmptyReferenceRgb] = useState<VisionRgb | null>(null);
  const [preview, setPreview] = useState<ReturnType<typeof createPhotoProgressPreview> | null>(null);

  const boards = useMemo(
    () => splitBeadDataIntoBoards(beadData, boardSize),
    [beadData, boardSize],
  );
  const selectedBoard = boards[initialBoardIndex] || boards[0] || null;

  if (!visible) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    setCorners([]);
    setEmptyReferenceRgb(null);
    setPreview(null);
    setStep("corners");
  };

  const runPreview = () => {
    if (!canvasRef.current || !selectedBoard || corners.length !== 4 || !emptyReferenceRgb) {
      return;
    }
    const context = canvasRef.current.getContext("2d");
    if (!context) return;
    const frame = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const detection = analyzeVisionProgress({
      frameData: frame.data,
      frameWidth: frame.width,
      frameHeight: frame.height,
      boardTile: selectedBoard,
      corners: corners as [VisionPoint, VisionPoint, VisionPoint, VisionPoint],
      emptyReferenceRgb,
      tolerance: 42,
      preferredColorId: null,
    });
    setPreview(
      createPhotoProgressPreview({
        boardNumber: selectedBoard.index + 1,
        boardSize: selectedBoard.boardSize,
        usedWidth: selectedBoard.usedWidth,
        usedHeight: selectedBoard.usedHeight,
        detection,
        createdAt: Date.now(),
      }),
    );
    setStep("preview");
  };

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <div style={styles.sheet}>
        <div style={styles.header}>
          <div>
            <strong>拍照同步进度（试验）</strong>
            <div style={styles.subtle}>当前只做识别预览，不保存进度</div>
          </div>
          <button type="button" onClick={onClose} style={styles.iconButton} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        {step === "upload" && (
          <label style={styles.uploadBox}>
            选择实物照片
            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
          </label>
        )}

        {imageUrl && (
          <div style={styles.previewBox}>
            <img src={imageUrl} alt="实物拼豆板照片" style={styles.image} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        )}

        {step === "corners" && (
          <div style={styles.panel}>
            请点击拼豆板{CORNER_LABELS[corners.length] || "四角"}。四角顺序：左上、右上、右下、左下。
          </div>
        )}

        {step === "empty-reference" && (
          <div style={styles.panel}>请点击一个还没放豆的空孔作为参考色。</div>
        )}

        {step === "preview" && preview && (
          <div style={styles.panel}>
            候选完成 {preview.summary.doneCandidateCount} 格 · 疑似错误 {preview.summary.suspectedWrongCount} · 低可信 {preview.summary.lowConfidenceCount}
          </div>
        )}

        <div style={styles.footer}>
          <button type="button" onClick={() => setStep("upload")} style={styles.secondaryButton}>
            重新上传
          </button>
          <button type="button" onClick={runPreview} style={styles.primaryButton}>
            生成预览
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 5000,
    background: "rgba(16, 18, 27, 0.46)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  sheet: {
    width: "min(420px, 100%)",
    maxHeight: "90vh",
    overflow: "auto",
    borderRadius: 24,
    background: "#fffaf4",
    boxShadow: "0 24px 70px rgba(20, 12, 8, 0.28)",
    padding: 16,
  },
  header: { display: "flex", justifyContent: "space-between", gap: 12 },
  subtle: { marginTop: 4, color: "#7d7188", fontSize: 12 },
  iconButton: { border: 0, background: "transparent", padding: 8 },
  uploadBox: {
    marginTop: 16,
    display: "grid",
    placeItems: "center",
    minHeight: 160,
    border: "1px dashed #9bdcf7",
    borderRadius: 18,
    color: "#42506b",
  },
  previewBox: { marginTop: 12, borderRadius: 16, overflow: "hidden", background: "#151824" },
  image: { display: "block", width: "100%" },
  panel: { marginTop: 12, padding: 12, borderRadius: 14, background: "#f7fbff", color: "#42506b" },
  footer: { marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" },
  secondaryButton: { borderRadius: 999, border: "1px solid #f2ded5", background: "#fff", padding: "9px 14px" },
  primaryButton: { borderRadius: 999, border: 0, background: "#79cdf6", color: "#243047", padding: "9px 16px" },
};
```

This skeleton intentionally does not complete image-to-canvas drawing and click-to-corner mapping in the same task. The next task adds those behaviors under test.

- [ ] **Step 3: Wire modal entry in MakingPage**

Modify `perler-beads/src/pages/mobile/MakingPage.tsx`:

```tsx
import PhotoProgressSyncModal from "../../components/PhotoProgressSyncModal";
```

Add state near existing modal states:

```tsx
const [showPhotoProgressSync, setShowPhotoProgressSync] = useState(false);
```

Add tool drawer entry near `视觉辅助`:

```tsx
<button
  type="button"
  style={styles.settingRow}
  onClick={() => {
    setShowPhotoProgressSync(true);
  }}
>
  <span style={styles.settingLabel}>拍照同步</span>
  <span style={styles.settingValue}>识别实物完成度（试验）</span>
</button>
```

Render modal near `BoardVisionAssistModal`:

```tsx
{beadData && visionBoardRecommendation && (
  <PhotoProgressSyncModal
    visible={showPhotoProgressSync}
    onClose={() => setShowPhotoProgressSync(false)}
    beadData={beadData}
    boardSize={visionBoardRecommendation.boardSize}
    initialBoardIndex={visionInitialBoardIndex}
  />
)}
```

- [ ] **Step 4: Run contract test**

```powershell
node TEST\photo_progress_modal_contract.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Build**

```powershell
Push-Location perler-beads
npm run build
Pop-Location
```

Expected: PASS, existing Vite chunk-size warning is acceptable.

- [ ] **Step 6: Commit Phase1-B modal skeleton**

```powershell
git add perler-beads/src/components/PhotoProgressSyncModal.tsx perler-beads/src/pages/mobile/MakingPage.tsx TEST/photo_progress_modal_contract.test.mjs
git commit -m "feat: add photo progress sync preview entry"
```

## 9. Task 4: Image Calibration Behavior
**Files:**
- Modify: `perler-beads/src/components/PhotoProgressSyncModal.tsx`
- Modify: `TEST/photo_progress_modal_contract.test.mjs`

- [ ] **Step 1: Extend contract test for canvas drawing and point mapping**

Add assertions:

```js
test("photo progress modal maps image clicks into canvas-space calibration points", () => {
  const source = read(modalPath);
  assert.match(source, /getImagePoint/);
  assert.match(source, /handleImageClick/);
  assert.match(source, /drawImageToCanvas/);
  assert.match(source, /setCorners/);
  assert.match(source, /setEmptyReferenceRgb/);
});
```

Expected: FAIL.

- [ ] **Step 2: Implement image drawing and click mapping**

Add helper functions inside `PhotoProgressSyncModal.tsx`:

```tsx
const getImagePoint = (
  event: React.MouseEvent<HTMLImageElement>,
  image: HTMLImageElement,
): VisionPoint | null => {
  const rect = image.getBoundingClientRect();
  if (!rect.width || !rect.height || !image.naturalWidth || !image.naturalHeight) return null;
  return {
    x: ((event.clientX - rect.left) / rect.width) * image.naturalWidth,
    y: ((event.clientY - rect.top) / rect.height) * image.naturalHeight,
  };
};

const sampleCanvasRgb = (
  canvas: HTMLCanvasElement,
  point: VisionPoint,
): VisionRgb | null => {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const x = Math.max(0, Math.min(canvas.width - 1, Math.round(point.x)));
  const y = Math.max(0, Math.min(canvas.height - 1, Math.round(point.y)));
  const data = context.getImageData(x, y, 1, 1).data;
  return [data[0], data[1], data[2]];
};
```

Add image load and click behavior:

```tsx
const drawImageToCanvas = (image: HTMLImageElement) => {
  if (!canvasRef.current) return;
  canvasRef.current.width = image.naturalWidth;
  canvasRef.current.height = image.naturalHeight;
  const context = canvasRef.current.getContext("2d");
  if (!context) return;
  context.drawImage(image, 0, 0);
};

const handleImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
  const point = getImagePoint(event, event.currentTarget);
  if (!point) return;
  if (step === "corners") {
    setCorners((prev) => {
      const next = [...prev, point].slice(0, 4);
      if (next.length === 4) setStep("empty-reference");
      return next;
    });
    return;
  }
  if (step === "empty-reference" && canvasRef.current) {
    const rgb = sampleCanvasRgb(canvasRef.current, point);
    if (rgb) setEmptyReferenceRgb(rgb);
  }
};
```

Attach to `<img>`:

```tsx
<img
  src={imageUrl}
  alt="实物拼豆板照片"
  style={styles.image}
  onLoad={(event) => drawImageToCanvas(event.currentTarget)}
  onClick={handleImageClick}
/>
```

- [ ] **Step 3: Run contract test and build**

```powershell
node TEST\photo_progress_modal_contract.test.mjs
Push-Location perler-beads
npm run build
Pop-Location
```

Expected: PASS.

- [ ] **Step 4: Commit calibration behavior**

```powershell
git add perler-beads/src/components/PhotoProgressSyncModal.tsx TEST/photo_progress_modal_contract.test.mjs
git commit -m "feat: add photo progress calibration flow"
```

## 10. Task 5: Synthetic Recognition Smoke
**Files:**
- Create: `TEST/photo_progress_synthetic_fixture.mjs`
- Modify: `TEST/photo_progress_service.test.mjs`

- [ ] **Step 1: Add synthetic fixture generator**

Create `TEST/photo_progress_synthetic_fixture.mjs`:

```js
export const createSyntheticDetection = ({ qualityLevel = "good", variant = "perfect" } = {}) => {
  const target = { id: "A1", hex: "#111111" };
  const wrong = { id: "B2", hex: "#222222" };
  const cells = [];
  for (let index = 0; index < 16; index += 1) {
    const x = index % 4;
    const y = Math.floor(index / 4);
    let state = "matched";
    let detectedColor = target;
    let detectedDistance = 24;
    if (variant === "missing" && index < 4) {
      state = "missing";
      detectedColor = null;
      detectedDistance = null;
    }
    if (variant === "wrong" && index < 2) {
      state = "wrong";
      detectedColor = wrong;
      detectedDistance = 40;
    }
    cells.push({
      index,
      x,
      y,
      target,
      detectedColor,
      detectedDistance,
      state,
      sample: [20, 20, 20],
      center: { x: x * 10 + 5, y: y * 10 + 5 },
    });
  }
  return {
    totalTargetCells: 16,
    matchedCells: cells.filter((cell) => cell.state === "matched").length,
    missingCells: cells.filter((cell) => cell.state === "missing").length,
    wrongCells: cells.filter((cell) => cell.state === "wrong").length,
    extraFilledCells: 0,
    progress: 1,
    activeColorId: "A1",
    activeColorMatched: 0,
    activeColorRemaining: 0,
    colors: [],
    guideCells: [],
    matchedGuideCells: [],
    wrongGuideCells: [],
    wrongCellsDetail: [],
    wrongColorSuggestions: [],
    markerRadius: 4,
    quality: {
      level: qualityLevel,
      brightness: qualityLevel === "poor" ? 245 : 128,
      tint: qualityLevel === "poor" ? 30 : 0,
      glareRatio: qualityLevel === "poor" ? 0.3 : 0,
      issues: qualityLevel === "poor" ? ["反光明显"] : [],
    },
    detectedCells: cells,
  };
};
```

- [ ] **Step 2: Add tests for synthetic variants**

Add the import at the top of `TEST/photo_progress_service.test.mjs`, then add the tests after the existing tests:

```js
import { createSyntheticDetection } from "./photo_progress_synthetic_fixture.mjs";

test("synthetic perfect board creates all done candidates", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: createSyntheticDetection({ variant: "perfect" }),
    createdAt: 1710000000000,
  });
  assert.equal(preview.summary.doneCandidateCount, 16);
});

test("synthetic wrong board separates suspected wrong from done candidates", () => {
  const preview = createPhotoProgressPreview({
    boardNumber: 1,
    boardSize: 4,
    usedWidth: 4,
    usedHeight: 4,
    detection: createSyntheticDetection({ variant: "wrong" }),
    createdAt: 1710000000000,
  });
  assert.equal(preview.summary.suspectedWrongCount, 2);
  assert.equal(preview.summary.doneCandidateCount, 14);
});
```

- [ ] **Step 3: Run synthetic tests**

```powershell
node TEST\photo_progress_service.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit synthetic smoke fixtures**

```powershell
git add TEST/photo_progress_synthetic_fixture.mjs TEST/photo_progress_service.test.mjs
git commit -m "test: add photo progress synthetic fixtures"
```

## 11. MCP Verification Plan
Run local app:

```powershell
Push-Location perler-beads
npm run dev
Pop-Location
```

MCP phone viewport:
1. Navigate to `http://127.0.0.1:5173/mobile/making?test=1`.
2. Switch to single-board mode if needed.
3. Open tool drawer.
4. Confirm `拍照同步` exists.
5. Open modal.
6. Confirm page canvas is visually behind overlay and not layout-shifted.
7. Upload a synthetic PNG.
8. Click four corners in order.
9. Click empty reference point.
10. Click `生成预览`.
11. Confirm summary shows candidate done / suspected wrong / low confidence.
12. Close modal.
13. Confirm pan, pinch/zoom slider, reset, next board still work.
14. Open existing `视觉辅助` to confirm old entry still exists.

Desktop/traditional:
1. Resize wide desktop viewport.
2. Confirm desktop layout not polluted by mobile-only tool placement.
3. Switch traditional mode.
4. Confirm no photo progress overlay remains visible.

## 12. Real Device Acceptance Plan
Android Chrome:
- Upload clear photo.
- Manually calibrate corners.
- Verify touch targets are reachable with one hand.
- Verify preview labels do not hide the image.

iPhone Safari:
- Use camera capture from `<input accept="image/*" capture="environment">`.
- Verify image loads after capture.
- Verify orientation is acceptable; if iOS rotates unexpectedly, record as Phase1-B blocker.
- Verify modal scroll does not move the underlying canvas.

Photo quality:
- Clear daylight photo should produce candidate done cells.
- Night lamp photo may show low confidence but must not present false certainty.
- Reflective photo must show warning/low confidence rather than clean success.

## 13. Rollback Strategy
Phase1-A rollback:

```powershell
git revert <phase1a-commit>
```

Phase1-B rollback:

```powershell
git revert <phase1b-modal-commit>
git revert <phase1b-calibration-commit>
```

Manual rollback if not committed:
- Remove `perler-beads/src/components/PhotoProgressSyncModal.tsx`.
- Remove `perler-beads/src/services/photoProgressService.js`.
- Remove `TEST/photo_progress_service.test.mjs`.
- Remove `TEST/photo_progress_modal_contract.test.mjs`.
- Remove `TEST/photo_progress_synthetic_fixture.mjs`.
- Revert `MakingPage.tsx` import, state, entry, and modal render.

## 14. Stop Conditions
Stop and report before continuing if:
- `photoProgressService` tests show `wrong` can become confirmed progress.
- `qualityLevel = poor` still produces done candidates.
- Modal requires layout space instead of fixed overlay.
- Tool drawer opening no longer freezes the canvas.
- iPhone photo upload fails to load a captured image.
- Existing `视觉辅助` entry disappears.
- Single-board immersive pan/zoom/cut-board behavior changes.

## 15. Plan Self-Review
Spec coverage:
- Phase1-A data structure and conversion rules are covered by Task 1.
- Phase1-B upload/corner/empty-reference/preview flow is covered by Tasks 2 and 3.
- Low-confidence visualization is represented by preview state and modal summary.
- Conservative persistence is enforced because this plan does not implement saving, and confirm function only persists selected `done_candidate` cells.
- Synthetic sample testing is covered by Task 5.
- MCP and real-device acceptance are defined.

Ambiguity resolution:
- `suspected_wrong` and `low_confidence` are not persisted as completion.
- `qualityLevel = poor` blocks done candidates.
- Phase1-B does not include `确认同步进度`.
- Existing real-time vision assist remains available.
