# Making Workflow Productization Phase1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first productized making-workflow increment: current-board status, current cell/color readability, help entry, and export preflight copy without changing the stable mobile immersive gesture/layout model.

**Architecture:** Keep logic changes small and testable by adding pure helper functions to `singleBoardInteraction.js`, then consume those helpers in `MakingPage.tsx` as read-only overlay state. UI changes stay in existing overlay surfaces and inline style objects; export changes are copy/preflight only and do not change render/download behavior.

**Tech Stack:** React 19, TypeScript TSX, Vite, Node test runner, Canvas-based making view, existing inline style system, existing mobile immersive CSS contract.

---

## Scope Guard

Implement only P0 plus low-risk export copy:

- Phase1-A: current-board status overlay and current color/cell summary.
- Phase1-B: help entry in tool drawer plus help panel freeze behavior.
- Phase1-C: export preflight copy and contract/MCP validation.

Do not implement:

- Gesture threshold changes.
- Board switching model changes.
- Pan boundary changes.
- Reset view behavior changes.
- Color-id canvas/overlay synchronization changes.
- Completion cloud sync or inventory deduction changes.
- Export engine rewrite, ZIP rewrite, or canvas memory strategy changes.
- Template/content ecosystem work.
- Broad `MakingPage.tsx` refactor.

## File Structure

**Modify:**

- `perler-beads/src/utils/singleBoardInteraction.js`
  - Owns pure, testable workflow helper functions.
  - Add helpers for current-board status, current-color summary, and help overlay lock state.

- `TEST/single_board_interaction.test.mjs`
  - Unit tests for all new helper functions and invariant preservation.

- `TEST/mobile_immersive_visual_contract.test.mjs`
  - Source-level contract tests ensuring new overlay hooks remain overlay-only and help panel participates in freeze.

- `perler-beads/src/pages/mobile/MakingPage.tsx`
  - Consumes helper output.
  - Adds read-only overlay content, help entry, help panel, and lock condition.
  - Keeps existing canvas gesture functions unchanged.

- `perler-beads/src/components/ExportModal.tsx`
  - Adds preflight explanation copy and optional context props.
  - Does not change export rendering or download loop.

- `MD/client/2026-05-15_making_workflow_productization_phase1_implementation.md`
  - Implementation record after code is complete.

**No new runtime component file in Phase1:** keep the first increment small. If `MakingPage.tsx` becomes harder to maintain during implementation, stop and open a separate refactor proposal instead of splitting during this phase.

## Phase Split

### Phase1-A: Board Status + Current Color Readability

Risk level: medium.

Files:

- Modify: `perler-beads/src/utils/singleBoardInteraction.js`
- Modify: `TEST/single_board_interaction.test.mjs`
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `TEST/mobile_immersive_visual_contract.test.mjs`

- [ ] **Step 1: Add failing helper tests for board workflow status**

Append these tests to `TEST/single_board_interaction.test.mjs`:

```js
test("workflow status summarizes active board row column progress and next pending board", () => {
  assert.deepEqual(
    getSingleBoardWorkflowStatus({
      activeBoardNumber: 3,
      boardCols: 2,
      totalBoardCount: 6,
      doneCount: 2,
      remainingCount: 4,
      boardDone: false,
      nextPendingBoardNumber: 4,
    }),
    {
      boardLabel: "板3",
      boardPositionLabel: "第2行 第1列",
      progressLabel: "2/6",
      remainingLabel: "剩余4块",
      stateLabel: "进行中",
      nextActionLabel: "下一步：完成本板",
      nextPendingLabel: "下一块：板4",
    },
  );
});

test("workflow status handles completed active board without next pending board", () => {
  assert.deepEqual(
    getSingleBoardWorkflowStatus({
      activeBoardNumber: 2,
      boardCols: 2,
      totalBoardCount: 2,
      doneCount: 2,
      remainingCount: 0,
      boardDone: true,
      nextPendingBoardNumber: null,
    }),
    {
      boardLabel: "板2",
      boardPositionLabel: "第1行 第2列",
      progressLabel: "2/2",
      remainingLabel: "全部完成",
      stateLabel: "已完成",
      nextActionLabel: "下一步：导出图纸",
      nextPendingLabel: null,
    },
  );
});
```

Also update the import block:

```js
import {
  // existing imports...
  getSingleBoardWorkflowStatus,
} from "../perler-beads/src/utils/singleBoardInteraction.js";
```

- [ ] **Step 2: Run helper tests and verify expected failure**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: FAIL with `getSingleBoardWorkflowStatus` not exported or not defined.

- [ ] **Step 3: Implement `getSingleBoardWorkflowStatus`**

Add this function to `perler-beads/src/utils/singleBoardInteraction.js` near the other single-board helpers:

```js
/**
 * @param {{
 *   activeBoardNumber: number;
 *   boardCols: number;
 *   totalBoardCount: number;
 *   doneCount: number;
 *   remainingCount: number;
 *   boardDone: boolean;
 *   nextPendingBoardNumber: number | null;
 * }} input
 */
export function getSingleBoardWorkflowStatus({
  activeBoardNumber,
  boardCols,
  totalBoardCount,
  doneCount,
  remainingCount,
  boardDone,
  nextPendingBoardNumber,
}) {
  const safeBoard = Math.max(1, Math.floor(Number(activeBoardNumber) || 1));
  const safeCols = Math.max(1, Math.floor(Number(boardCols) || 1));
  const row = Math.floor((safeBoard - 1) / safeCols) + 1;
  const col = ((safeBoard - 1) % safeCols) + 1;
  const safeTotal = Math.max(0, Math.floor(Number(totalBoardCount) || 0));
  const safeDone = Math.max(0, Math.floor(Number(doneCount) || 0));
  const safeRemaining = Math.max(0, Math.floor(Number(remainingCount) || 0));
  const hasNextPending = Number.isFinite(Number(nextPendingBoardNumber));

  return {
    boardLabel: `板${safeBoard}`,
    boardPositionLabel: `第${row}行 第${col}列`,
    progressLabel: `${safeDone}/${safeTotal}`,
    remainingLabel: safeRemaining > 0 ? `剩余${safeRemaining}块` : "全部完成",
    stateLabel: boardDone ? "已完成" : "进行中",
    nextActionLabel: boardDone
      ? hasNextPending
        ? `下一步：继续板${nextPendingBoardNumber}`
        : "下一步：导出图纸"
      : "下一步：完成本板",
    nextPendingLabel: hasNextPending ? `下一块：板${nextPendingBoardNumber}` : null,
  };
}
```

- [ ] **Step 4: Run tests for board workflow status**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: PASS for the newly added workflow status tests and no regression in existing tests.

- [ ] **Step 5: Add failing helper tests for current color/cell summary**

Append these tests to `TEST/single_board_interaction.test.mjs`:

```js
test("current color summary returns selected cell and current board color count", () => {
  assert.deepEqual(
    getSingleBoardCurrentColorSummary({
      selectedCell: { x: 64, y: 81 },
      selectedColorId: "C73",
      selectedColorHex: "#aabbcc",
      colorCountInScope: 12,
      colorCountTotal: 48,
      boardNumber: 3,
      localRow: 28,
      localCol: 11,
    }),
    {
      visible: true,
      colorLabel: "C73",
      colorHex: "#aabbcc",
      cellLabel: "列11 行28",
      boardLabel: "板3",
      countLabel: "本板12颗 / 总计48颗",
    },
  );
});

test("current color summary stays hidden without a selected color", () => {
  assert.deepEqual(
    getSingleBoardCurrentColorSummary({
      selectedCell: null,
      selectedColorId: "",
      selectedColorHex: "",
      colorCountInScope: 0,
      colorCountTotal: 0,
      boardNumber: 1,
      localRow: 1,
      localCol: 1,
    }),
    {
      visible: false,
      colorLabel: "",
      colorHex: "",
      cellLabel: "",
      boardLabel: "",
      countLabel: "",
    },
  );
});
```

Update imports:

```js
import {
  // existing imports...
  getSingleBoardCurrentColorSummary,
} from "../perler-beads/src/utils/singleBoardInteraction.js";
```

- [ ] **Step 6: Run current color summary tests and verify expected failure**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: FAIL with `getSingleBoardCurrentColorSummary` not exported or not defined.

- [ ] **Step 7: Implement `getSingleBoardCurrentColorSummary`**

Add this function to `perler-beads/src/utils/singleBoardInteraction.js`:

```js
/**
 * @param {{
 *   selectedCell: { x: number; y: number } | null;
 *   selectedColorId: string | undefined;
 *   selectedColorHex: string | undefined;
 *   colorCountInScope: number;
 *   colorCountTotal: number;
 *   boardNumber: number;
 *   localRow: number;
 *   localCol: number;
 * }} input
 */
export function getSingleBoardCurrentColorSummary({
  selectedCell,
  selectedColorId,
  selectedColorHex,
  colorCountInScope,
  colorCountTotal,
  boardNumber,
  localRow,
  localCol,
}) {
  if (!selectedCell || !selectedColorHex) {
    return {
      visible: false,
      colorLabel: "",
      colorHex: "",
      cellLabel: "",
      boardLabel: "",
      countLabel: "",
    };
  }

  const colorLabel = selectedColorId || selectedColorHex;
  return {
    visible: true,
    colorLabel,
    colorHex: selectedColorHex,
    cellLabel: `列${localCol} 行${localRow}`,
    boardLabel: `板${boardNumber}`,
    countLabel: `本板${colorCountInScope}颗 / 总计${colorCountTotal}颗`,
  };
}
```

- [ ] **Step 8: Run helper tests**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: PASS.

- [ ] **Step 9: Wire helper state into `MakingPage.tsx`**

Modify the import from `../../utils/singleBoardInteraction.js` to include:

```ts
  getSingleBoardCurrentColorSummary,
  getSingleBoardWorkflowStatus,
```

Add these `useMemo` blocks after `nextPendingBoardNumber` is computed:

```ts
  const singleBoardWorkflowStatus = useMemo(
    () =>
      getSingleBoardWorkflowStatus({
        activeBoardNumber,
        boardCols: physicalBoardCols,
        totalBoardCount: singleBoardProgress.totalCount,
        doneCount: singleBoardProgress.doneCount,
        remainingCount: singleBoardProgress.remainingCount,
        boardDone: activeBoardDone,
        nextPendingBoardNumber,
      }),
    [
      activeBoardDone,
      activeBoardNumber,
      nextPendingBoardNumber,
      physicalBoardCols,
      singleBoardProgress.doneCount,
      singleBoardProgress.remainingCount,
      singleBoardProgress.totalCount,
    ],
  );

  const selectedBoardCoordinate = selectedCell
    ? getPhysicalBoardCoordinate(selectedCell.x, selectedCell.y)
    : null;

  const singleBoardCurrentColorSummary = useMemo(
    () =>
      getSingleBoardCurrentColorSummary({
        selectedCell,
        selectedColorId:
          selection.type === "color" ? selection.colorId : undefined,
        selectedColorHex:
          selection.type === "color" ? selection.colorHex : undefined,
        colorCountInScope: colorCountInBlock,
        colorCountTotal,
        boardNumber: selectedBoardCoordinate?.boardNumber ?? activeBoardNumber,
        localRow: selectedBoardCoordinate?.localRow ?? 0,
        localCol: selectedBoardCoordinate?.localCol ?? 0,
      }),
    [
      activeBoardNumber,
      colorCountInBlock,
      colorCountTotal,
      selectedBoardCoordinate?.boardNumber,
      selectedBoardCoordinate?.localCol,
      selectedBoardCoordinate?.localRow,
      selectedCell,
      selection.colorHex,
      selection.colorId,
      selection.type,
    ],
  );
```

If TypeScript reports that `selectedBoardCoordinate` should also be memoized, convert it to:

```ts
  const selectedBoardCoordinate = useMemo(
    () =>
      selectedCell
        ? getPhysicalBoardCoordinate(selectedCell.x, selectedCell.y)
        : null,
    [getPhysicalBoardCoordinate, selectedCell],
  );
```

- [ ] **Step 10: Add mobile immersive status overlay markup**

Inside the mobile single-board chrome stack, replace only the summary text content in the existing `singleBoardMobileSummaryRow` block. Keep the existing wrapper and overlay class.

Use:

```tsx
<div style={styles.singleBoardMobileSummaryMain}>
  <span style={styles.singleBoardMobileSummaryText}>
    {singleBoardWorkflowStatus.boardLabel} · {singleBoardWorkflowStatus.boardPositionLabel}
  </span>
  <span style={styles.singleBoardMobileSummaryText}>
    进度 {singleBoardWorkflowStatus.progressLabel} · {singleBoardWorkflowStatus.remainingLabel}
  </span>
  <span
    style={{
      ...styles.singleBoardStatePill,
      ...(activeBoardDone
        ? styles.singleBoardStatePillDone
        : styles.singleBoardStatePillTodo),
    }}
  >
    {singleBoardWorkflowStatus.stateLabel}
  </span>
  {singleBoardCurrentColorSummary.visible && (
    <span style={styles.singleBoardMobileCurrentColorPill}>
      <span
        style={{
          ...styles.singleBoardMobileCurrentColorSwatch,
          backgroundColor: singleBoardCurrentColorSummary.colorHex,
        }}
      />
      {singleBoardCurrentColorSummary.boardLabel} · {singleBoardCurrentColorSummary.cellLabel} · {singleBoardCurrentColorSummary.colorLabel} · {singleBoardCurrentColorSummary.countLabel}
    </span>
  )}
  {resumeBoardNumber && resumeBoardNumber !== activeBoardNumber && (
    <button
      style={styles.singleBoardResumeBtn}
      onClick={() => activateBoard(resumeBoardNumber, true)}
    >
      继续未完成
    </button>
  )}
</div>
```

Add these style entries near related single-board mobile styles in `styles`:

```ts
  singleBoardMobileCurrentColorPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    padding: "2px 7px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(255,198,220,0.72)",
    color: "#35233d",
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  singleBoardMobileCurrentColorSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    border: "1px solid rgba(0,0,0,0.18)",
    flexShrink: 0,
  },
```

- [ ] **Step 11: Add visual contract for overlay-only status**

Append to `TEST/mobile_immersive_visual_contract.test.mjs`:

```js
test("making workflow productization status uses mobile immersive overlay hooks", () => {
  const source = read(makingPagePath);
  assert.match(source, /singleBoardWorkflowStatus/);
  assert.match(source, /singleBoardCurrentColorSummary/);
  assert.match(source, /singleBoardMobileCurrentColorPill/);
  assert.match(source, /mobileImmersiveClass\("summary-pill"\)/);
});
```

- [ ] **Step 12: Run Phase1-A tests**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

Expected: both PASS.

- [ ] **Step 13: Commit Phase1-A**

Run:

```powershell
git add perler-beads/src/utils/singleBoardInteraction.js TEST/single_board_interaction.test.mjs TEST/mobile_immersive_visual_contract.test.mjs perler-beads/src/pages/mobile/MakingPage.tsx
git commit -m "feat: add making workflow board status overlay"
```

Expected: commit succeeds. Do not build or publish yet.

### Phase1-B: Help Entry + Freeze Model

Risk level: medium.

Files:

- Modify: `perler-beads/src/utils/singleBoardInteraction.js`
- Modify: `TEST/single_board_interaction.test.mjs`
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `TEST/mobile_immersive_visual_contract.test.mjs`

- [ ] **Step 1: Add failing helper tests for interaction lock**

Append to `TEST/single_board_interaction.test.mjs`:

```js
test("mobile immersive interaction lock includes tool drawer settings overview and help", () => {
  assert.equal(
    getSingleBoardInteractionLockState({
      isSingleBoardMobileImmersive: true,
      toolbarExpanded: false,
      settingsOpen: false,
      overviewOpen: false,
      helpOpen: true,
    }),
    true,
  );
  assert.equal(
    getSingleBoardInteractionLockState({
      isSingleBoardMobileImmersive: true,
      toolbarExpanded: false,
      settingsOpen: false,
      overviewOpen: false,
      helpOpen: false,
    }),
    false,
  );
  assert.equal(
    getSingleBoardInteractionLockState({
      isSingleBoardMobileImmersive: false,
      toolbarExpanded: true,
      settingsOpen: true,
      overviewOpen: true,
      helpOpen: true,
    }),
    false,
  );
});
```

Update imports:

```js
import {
  // existing imports...
  getSingleBoardInteractionLockState,
} from "../perler-beads/src/utils/singleBoardInteraction.js";
```

- [ ] **Step 2: Run lock tests and verify expected failure**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: FAIL with `getSingleBoardInteractionLockState` not exported or not defined.

- [ ] **Step 3: Implement lock helper**

Add to `perler-beads/src/utils/singleBoardInteraction.js`:

```js
/**
 * @param {{
 *   isSingleBoardMobileImmersive: boolean;
 *   toolbarExpanded: boolean;
 *   settingsOpen: boolean;
 *   overviewOpen: boolean;
 *   helpOpen: boolean;
 * }} input
 */
export function getSingleBoardInteractionLockState({
  isSingleBoardMobileImmersive,
  toolbarExpanded,
  settingsOpen,
  overviewOpen,
  helpOpen,
}) {
  return Boolean(
    isSingleBoardMobileImmersive &&
      (toolbarExpanded || settingsOpen || overviewOpen || helpOpen),
  );
}
```

- [ ] **Step 4: Run lock helper test**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Wire help panel state into `MakingPage.tsx`**

Add state near `showSettings`:

```ts
  const [showMakingHelp, setShowMakingHelp] = useState(false);
```

Add `getSingleBoardInteractionLockState` to the interaction helper import.

Replace the existing lock expression:

```ts
  const isSingleBoardInteractionLocked =
    isSingleBoardMobileImmersive &&
    (singleBoardMobileToolbarExpanded ||
      showSettings ||
      singleBoardMobileMiniMapExpanded);
```

with:

```ts
  const isSingleBoardInteractionLocked = getSingleBoardInteractionLockState({
    isSingleBoardMobileImmersive,
    toolbarExpanded: singleBoardMobileToolbarExpanded,
    settingsOpen: showSettings,
    overviewOpen: singleBoardMobileMiniMapExpanded,
    helpOpen: showMakingHelp,
  });
```

- [ ] **Step 6: Add help entry to the mobile tool row**

Inside the `singleBoardMobileToolRow`, after the `辅助` button and before conditional `换色`, add:

```tsx
<button
  style={styles.singleBoardMobileToolChip}
  onClick={() => {
    setSingleBoardMobileToolbarExpanded(false);
    setShowMakingHelp(true);
  }}
  title="查看制作帮助"
>
  帮助
</button>
```

Inside the mobile settings panel, add a help row after the `图纸` row:

```tsx
<div style={styles.settingRow}>
  <span style={styles.settingLabel}>制作帮助</span>
  <button
    style={{
      ...styles.actionBtn,
      padding: "8px 12px",
      fontSize: "12px",
    }}
    onClick={() => {
      setShowSettings(false);
      setShowMakingHelp(true);
    }}
  >
    查看
  </button>
</div>
```

- [ ] **Step 7: Add help panel overlay**

Add this block near the existing onboarding overlay, before `ExportModal`:

```tsx
{showMakingHelp && viewMode === "singleBoard" && (
  <div
    style={styles.singleBoardMakingHelpOverlay}
    onClick={() => setShowMakingHelp(false)}
  >
    <div
      style={styles.singleBoardMakingHelpCard}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={styles.singleBoardMakingHelpHeader}>
        <span style={styles.singleBoardMakingHelpTitle}>单板制作帮助</span>
        <button
          style={styles.singleBoardMakingHelpClose}
          onClick={() => setShowMakingHelp(false)}
          aria-label="关闭制作帮助"
        >
          ×
        </button>
      </div>
      <div style={styles.singleBoardMakingHelpList}>
        <p style={styles.singleBoardMakingHelpText}>1. 放大后点击格子，可查看当前色号和同色数量。</p>
        <p style={styles.singleBoardMakingHelpText}>2. 缩小到适板附近，拖到边缘后继续滑动可切换相邻板。</p>
        <p style={styles.singleBoardMakingHelpText}>3. 工具里可以打开总览、下载图纸、换色和辅助功能。</p>
        <p style={styles.singleBoardMakingHelpText}>4. 完成本板后再点“下一块”，避免漏拼。</p>
      </div>
    </div>
  </div>
)}
```

Add styles:

```ts
  singleBoardMakingHelpOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 60,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: "0 12px max(16px, env(safe-area-inset-bottom, 0px))",
    background: "rgba(28, 20, 34, 0.20)",
    pointerEvents: "auto",
  },
  singleBoardMakingHelpCard: {
    width: "min(360px, calc(100vw - 24px))",
    borderRadius: 18,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(255,210,226,0.92)",
    boxShadow: "0 18px 42px rgba(55,39,63,0.22)",
    padding: 14,
    color: "#32253c",
  },
  singleBoardMakingHelpHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  singleBoardMakingHelpTitle: {
    fontSize: 14,
    fontWeight: 900,
  },
  singleBoardMakingHelpClose: {
    width: 28,
    height: 28,
    borderRadius: 999,
    border: "1px solid rgba(160,120,150,0.25)",
    background: "rgba(255,255,255,0.72)",
    color: "#5d4b68",
    fontWeight: 900,
    cursor: "pointer",
  },
  singleBoardMakingHelpList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  singleBoardMakingHelpText: {
    margin: 0,
    fontSize: 12,
    lineHeight: 1.55,
    color: "#5d4b68",
  },
```

- [ ] **Step 8: Add source contract tests for help freeze**

Append to `TEST/mobile_immersive_visual_contract.test.mjs`:

```js
test("making help panel participates in immersive freeze model", () => {
  const source = read(makingPagePath);
  assert.match(source, /showMakingHelp/);
  assert.match(source, /getSingleBoardInteractionLockState/);
  assert.match(source, /helpOpen:\s*showMakingHelp/);
  assert.match(source, /singleBoardMakingHelpOverlay/);
});
```

- [ ] **Step 9: Run Phase1-B tests**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

Expected: both PASS.

- [ ] **Step 10: Commit Phase1-B**

Run:

```powershell
git add perler-beads/src/utils/singleBoardInteraction.js TEST/single_board_interaction.test.mjs TEST/mobile_immersive_visual_contract.test.mjs perler-beads/src/pages/mobile/MakingPage.tsx
git commit -m "feat: add making workflow help overlay"
```

Expected: commit succeeds. Do not build or publish yet.

### Phase1-C: Export Preflight Copy + Validation

Risk level: low to medium.

Files:

- Modify: `perler-beads/src/components/ExportModal.tsx`
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `TEST/mobile_immersive_visual_contract.test.mjs`
- Create: `MD/client/2026-05-15_making_workflow_productization_phase1_implementation.md`

- [ ] **Step 1: Add export preflight props to `ExportModal.tsx`**

Extend the props interface:

```ts
interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  beadData: BeadPixelData;
  onNeedRewardUnlock?: (reason: 'premium_export', onUnlocked?: () => void) => void;
  makingContext?: {
    mode: 'traditional' | 'singleBoard';
    activeBoardNumber?: number;
    totalBoardCount?: number;
  };
}
```

Update the component signature:

```ts
const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onClose,
  beadData,
  onNeedRewardUnlock,
  makingContext,
}) => {
```

Add derived copy after `paginatedPageCount`:

```ts
  const exportPreflightLines = [
    `图案尺寸：${patternWidth}x${patternHeight}`,
    paginateMode
      ? `分页打印：按 ${boardSize}x${boardSize} 拼豆板导出，预计 ${paginatedPageCount} 页`
      : '整图导出：生成一张完整图纸',
    makingContext?.mode === 'singleBoard'
      ? `当前制作：板${makingContext.activeBoardNumber ?? 1} / 共${makingContext.totalBoardCount ?? 1}块`
      : '当前制作：传统区块模式',
    '打印建议：按实际大小打印，关闭页面自动缩放，先测试一页',
  ];
```

- [ ] **Step 2: Render preflight copy without changing export behavior**

Add this section inside `styles.content`, before the export clarity section:

```tsx
<section style={styles.section}>
  <h3 style={styles.sectionTitle}>导出前确认</h3>
  <div style={styles.exportPreflightBox}>
    {exportPreflightLines.map((line) => (
      <span key={line} style={styles.exportPreflightLine}>
        {line}
      </span>
    ))}
  </div>
</section>
```

Add styles:

```ts
  exportPreflightBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 10,
    borderRadius: radius.md,
    background: 'linear-gradient(145deg, rgba(107,154,212,0.12), rgba(108,200,173,0.10))',
    border: `1px solid ${colors.border.soft}`,
  },
  exportPreflightLine: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 1.45,
  },
```

- [ ] **Step 3: Pass making context from `MakingPage.tsx`**

Update the `ExportModal` call:

```tsx
<ExportModal
  visible={showExportModal}
  onClose={() => setShowExportModal(false)}
  beadData={beadData}
  makingContext={{
    mode: viewMode,
    activeBoardNumber,
    totalBoardCount,
  }}
  onNeedRewardUnlock={(_reason, onUnlocked) => {
    pendingExportAfterRewardRef.current = onUnlocked || null;
    setShowRewardedUnlockModal(true);
  }}
/>
```

- [ ] **Step 4: Add export preflight source contract**

Append to `TEST/mobile_immersive_visual_contract.test.mjs`:

```js
test("export modal exposes preflight copy without changing export entry wiring", () => {
  const source = read(makingPagePath);
  const exportSource = read(
    new URL("../perler-beads/src/components/ExportModal.tsx", import.meta.url),
  );
  assert.match(source, /makingContext=\{\{/);
  assert.match(exportSource, /导出前确认/);
  assert.match(exportSource, /exportPreflightLines/);
  assert.match(exportSource, /打印建议：按实际大小打印/);
});
```

- [ ] **Step 5: Run Phase1-C tests**

Run:

```powershell
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Run full local verification**

Run:

```powershell
cmd /c node --test TEST\single_board_interaction.test.mjs
cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs
cmd /c npm.cmd run build
```

The build command must be run from `perler-beads`:

```powershell
cmd /c npm.cmd run build
```

with `workdir` set to `...\making-workflow-productization-phase1-design\perler-beads`.

Expected:

- Node tests exit 0.
- Vite build exits 0.

- [ ] **Step 7: MCP smoke validation**

Start local dev server from `perler-beads` only if no existing server is intended for the test:

```powershell
cmd /c npm.cmd run dev -- --host 127.0.0.1 --port 3005
```

MCP viewport:

- Mobile: `390x844`.
- URL: `http://127.0.0.1:3005/mobile/making?test=1`.

Validate:

- Single-board immersive paper still fills the viewport below the title bar.
- New current-board/current-color overlay is visible as overlay only.
- Tool drawer opens.
- Help entry opens.
- While help panel is open, dragging the canvas does not change stage transform.
- Overview opens and still freezes canvas.
- 100%, 150%, 200% low/mid zoom vertical pan still works.
- 300%+ free bounded drag still works.
- Multi-board switch does not misfire during normal pan.
- Export modal opens and shows preflight copy.
- Traditional mode still opens and can select/highlight color.

Stop if any invariant fails. Do not publish.

- [ ] **Step 8: Add implementation MD record**

Create `MD/client/2026-05-15_making_workflow_productization_phase1_implementation.md`:

```md
# 制作流程体验产品化 Phase1 实施记录

## 范围

- 当前板状态覆盖层。
- 当前格/当前色可读性增强。
- 工具抽屉内制作帮助入口。
- 帮助面板打开时冻结底层画布。
- 导出前确认说明。

## 未改动

- 未改手势优先级。
- 未改切板模型。
- 未改拖动边界。
- 未改复位逻辑。
- 未改生成质量算法。
- 未改导出渲染或下载引擎。

## 验证

- `cmd /c node --test TEST\single_board_interaction.test.mjs`
- `cmd /c node --test TEST\mobile_immersive_visual_contract.test.mjs`
- `cmd /c npm.cmd run build`
- MCP 手机视口验证：实际执行时记录手机单板沉浸式、工具冻结、低中倍率微移、高倍率拖动、多板切换和导出弹窗结果。

## 回滚

如出现沉浸式 layout、冻结、拖动、切板、色号渲染回归，优先回滚本阶段对应小提交，不回滚已冻结的 Phase1/Phase2 沉浸式基线。
```

- [ ] **Step 9: Commit Phase1-C**

Run:

```powershell
git add perler-beads/src/components/ExportModal.tsx perler-beads/src/pages/mobile/MakingPage.tsx TEST/mobile_immersive_visual_contract.test.mjs MD/client/2026-05-15_making_workflow_productization_phase1_implementation.md
git commit -m "feat: add making workflow export preflight"
```

Expected: commit succeeds. Do not publish.

## Rollback Strategy

- Roll back Phase1-A if current-board status or current-color readability interferes with canvas hit testing or layout.
- Roll back Phase1-B if help entry fails freeze behavior or blocks existing tool drawer behavior.
- Roll back Phase1-C if export modal behavior changes beyond copy/context display.
- If color-id zoom artifacts return, stop and revert the latest implementation commit before debugging.
- If mobile immersive work area height shrinks, stop and revert the latest overlay/layout commit before debugging.

## Explicitly Deferred Interactions

- Floating FAB drag persistence.
- Horizontal landscape redesign.
- Multi-board immersive expansion.
- Gesture threshold tuning.
- Auto-switch threshold changes.
- Completed-area canvas rendering changes.
- Inventory deduction integration.
- Cloud progress sync changes.
- Large image export memory optimization.
- Template/content ecosystem implementation.

## Final Verification Checklist

- `git status --short` shows only intended changes before each commit.
- Node tests pass after each phase.
- Build passes after Phase1-C.
- MCP validates mobile single-board immersive layout and freeze invariants.
- Desktop single-board remains usable.
- Traditional mode remains usable.
- No formal-domain deploy is performed in this plan.
