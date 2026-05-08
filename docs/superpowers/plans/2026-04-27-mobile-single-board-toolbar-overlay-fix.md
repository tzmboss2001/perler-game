# Mobile Single-Board Toolbar Overlay Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复手机端单板制作模式下顶部四按钮条遮挡图纸的问题，并把工具条改成更薄、可自动收起的半浮动形态。

**Architecture:** 在 `singleBoardInteraction.js` 中新增一组手机端单板顶部布局 helper，统一计算真实避让高度、工具条收起状态和收起后样式参数。`MakingPage.tsx` 通过 ref 测量顶部摘要区与工具条高度，驱动画布容器动态避让，同时只在 `isSingleBoardMobile && viewMode === "singleBoard"` 分支启用半浮动工具条和自动收起逻辑，避免影响桌面侧边栏与传统模式。

**Tech Stack:** React、TypeScript/TSX、Node test、Vite、Chrome DevTools MCP

---

### Task 1: 为手机端单板顶部避让与工具条状态写 failing tests

**Files:**
- Modify: `TEST/single_board_interaction.test.mjs`
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`

- [ ] **Step 1: 写顶部避让高度 helper 的 failing tests**

在 `TEST/single_board_interaction.test.mjs` 增加测试，覆盖：
- 手机端单板模式下，顶部避让高度应包含模式切换、摘要区、工具条高度
- 非手机端单板模式下，不启用这套避让逻辑

示例测试代码：

```js
test("mobile single-board top chrome offset includes summary and toolbar heights", () => {
  const result = getSingleBoardMobileTopChromeOffset({
    isSingleBoardMobile: true,
    summaryHeight: 28,
    toolbarHeight: 32,
    swipeStatusHeight: 0,
  });

  assert.equal(result, 106);
});

test("non-mobile single-board top chrome offset falls back to base value", () => {
  const result = getSingleBoardMobileTopChromeOffset({
    isSingleBoardMobile: false,
    summaryHeight: 28,
    toolbarHeight: 32,
    swipeStatusHeight: 10,
  });

  assert.equal(result, null);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: FAIL，提示 `getSingleBoardMobileTopChromeOffset is not a function` 或未导出。

- [ ] **Step 3: 写工具条收起状态 helper 的 failing tests**

继续在同一测试文件增加测试，覆盖：
- 手机端单板模式默认展开
- 开始拖动/缩放/点图纸后进入收起态
- 桌面端或传统模式不启用

示例测试代码：

```js
test("mobile single-board toolbar stays expanded before canvas interaction", () => {
  const result = getSingleBoardMobileToolbarState({
    isSingleBoardMobile: true,
    hasInteractedWithCanvas: false,
  });

  assert.deepEqual(result, {
    collapsed: false,
    showCollapsedHandle: false,
  });
});

test("mobile single-board toolbar collapses after canvas interaction", () => {
  const result = getSingleBoardMobileToolbarState({
    isSingleBoardMobile: true,
    hasInteractedWithCanvas: true,
  });

  assert.deepEqual(result, {
    collapsed: true,
    showCollapsedHandle: true,
  });
});
```

- [ ] **Step 4: 再跑一次测试确认仍然失败**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: FAIL，新增 helper 相关测试均失败。

- [ ] **Step 5: 在 helper 文件中做最小实现**

在 `perler-beads/src/utils/singleBoardInteraction.js` 增加：

```js
export function getSingleBoardMobileTopChromeOffset({
  isSingleBoardMobile,
  summaryHeight,
  toolbarHeight,
  swipeStatusHeight,
}) {
  if (!isSingleBoardMobile) return null;
  return 46 + summaryHeight + toolbarHeight + swipeStatusHeight;
}

export function getSingleBoardMobileToolbarState({
  isSingleBoardMobile,
  hasInteractedWithCanvas,
}) {
  if (!isSingleBoardMobile) {
    return {
      collapsed: false,
      showCollapsedHandle: false,
    };
  }

  return {
    collapsed: Boolean(hasInteractedWithCanvas),
    showCollapsedHandle: Boolean(hasInteractedWithCanvas),
  };
}
```

- [ ] **Step 6: 跑测试确认转绿**

Run: `cmd /c node --test TEST\single_board_interaction.test.mjs`

Expected: PASS，新增测试通过。

- [ ] **Step 7: 提交这一小步**

```bash
git add TEST/single_board_interaction.test.mjs perler-beads/src/utils/singleBoardInteraction.js
git commit -m "test: cover mobile toolbar overlay helpers"
```

### Task 2: 让画布区按真实顶部高度动态避让

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`

- [ ] **Step 1: 在页面中加入顶部区域测量 ref**

在 `MakingPage.tsx` 顶部相关区域增加：

```tsx
const singleBoardMobileSummaryRef = useRef<HTMLDivElement>(null);
const singleBoardMobileToolbarRef = useRef<HTMLDivElement>(null);
const singleBoardMobileSwipeStatusRef = useRef<HTMLDivElement>(null);

const [singleBoardMobileChromeHeights, setSingleBoardMobileChromeHeights] =
  useState({
    summary: 0,
    toolbar: 0,
    swipeStatus: 0,
  });
```

- [ ] **Step 2: 写布局测量 effect**

在 `useLayoutEffect` 中测量真实高度：

```tsx
useLayoutEffect(() => {
  if (!isSingleBoardMobile || viewMode !== "singleBoard") return;

  const measure = () => {
    setSingleBoardMobileChromeHeights({
      summary: singleBoardMobileSummaryRef.current?.offsetHeight ?? 0,
      toolbar: singleBoardMobileToolbarRef.current?.offsetHeight ?? 0,
      swipeStatus: singleBoardMobileSwipeStatusRef.current?.offsetHeight ?? 0,
    });
  };

  measure();
  window.addEventListener("resize", measure);
  return () => window.removeEventListener("resize", measure);
}, [isSingleBoardMobile, singleBoardMobileMiniMapExpanded, viewMode]);
```

- [ ] **Step 3: 用 helper 替换写死的 `singleBoardChromeOffset`**

把原来的：

```tsx
const singleBoardChromeOffset = viewMode === "singleBoard" ? 46 : 50;
```

改成：

```tsx
const singleBoardMobileTopChromeOffset = getSingleBoardMobileTopChromeOffset({
  isSingleBoardMobile,
  summaryHeight: singleBoardMobileChromeHeights.summary,
  toolbarHeight: singleBoardMobileChromeHeights.toolbar,
  swipeStatusHeight:
    totalBoardCount > 1 ? singleBoardMobileChromeHeights.swipeStatus : 0,
});

const singleBoardChromeOffset =
  viewMode !== "singleBoard"
    ? 50
    : singleBoardMobileTopChromeOffset ?? 46;
```

- [ ] **Step 4: 把 ref 挂到真实 DOM**

在手机端单板分支里把 ref 分别挂到：
- 摘要区容器
- 滑动状态提示
- 四按钮工具条容器

示例：

```tsx
<div ref={singleBoardMobileSummaryRef} style={styles.singleBoardMobileSummaryRow}>
```

```tsx
<div
  ref={singleBoardMobileToolbarRef}
  style={styles.singleBoardMobileToolbarRow}
>
```

- [ ] **Step 5: 跑测试和构建**

Run:
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
- `cmd /c npm.cmd run build`

Expected:
- tests PASS
- build PASS

- [ ] **Step 6: 提交这一小步**

```bash
git add perler-beads/src/pages/mobile/MakingPage.tsx perler-beads/src/utils/singleBoardInteraction.js TEST/single_board_interaction.test.mjs
git commit -m "fix: offset mobile single-board canvas below toolbar"
```

### Task 3: 把四按钮条改成更薄的半浮动工具条

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: 新增手机端单板浮动工具条样式**

在样式区增加一组新样式：

```tsx
singleBoardMobileToolbarRow: {
  display: "flex",
  alignItems: "center",
  gap: "4px",
  marginTop: "4px",
},

singleBoardMobileToolbarFloating: {
  alignSelf: "flex-start",
  padding: "4px 6px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.84)",
  backdropFilter: "blur(10px)",
  boxShadow: makingCandy.shadowSoft,
},

singleBoardMobileToolbarCollapsed: {
  padding: "2px 6px",
  gap: "3px",
},
```

- [ ] **Step 2: 压缩单按钮尺寸**

让手机端单板工具按钮在展开态更薄：

```tsx
const singleBoardToolbarBtnStyle: React.CSSProperties = {
  ...styles.singleBoardToolbarBtn,
  ...(isCompactToolbar ? styles.singleBoardToolbarBtnCompact : {}),
  ...(isSingleBoardMobile && viewMode === "singleBoard"
    ? {
        height: "24px",
        minWidth: "46px",
        padding: "0 8px",
        fontSize: "10px",
      }
    : {}),
};
```

- [ ] **Step 3: 给工具条容器叠加浮动视觉**

把工具条容器改成：

```tsx
<div
  ref={singleBoardMobileToolbarRef}
  style={{
    ...styles.singleBoardMobileToolbarRow,
    ...styles.singleBoardMobileToolbarFloating,
    ...(mobileSingleBoardToolbarUi.collapsed
      ? styles.singleBoardMobileToolbarCollapsed
      : {}),
  }}
>
```

- [ ] **Step 4: MCP 看真布局是否已不再像实体占位条**

Run local dev and MCP verify:
- 工具条仍在图纸上方安全区
- 但视觉高度更薄
- 图纸上沿不再被整行厚按钮压住

- [ ] **Step 5: 提交这一小步**

```bash
git add perler-beads/src/pages/mobile/MakingPage.tsx
git commit -m "feat: thin mobile single-board floating toolbar"
```

### Task 4: 实现自动收起与重新展开

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`

- [ ] **Step 1: 新增会话级交互状态**

在 `MakingPage.tsx` 增加：

```tsx
const [singleBoardMobileCanvasInteracted, setSingleBoardMobileCanvasInteracted] =
  useState(false);
```

- [ ] **Step 2: 在图纸交互入口标记已操作**

在以下入口里加入：

```tsx
if (isSingleBoardMobile && viewMode === "singleBoard") {
  setSingleBoardMobileCanvasInteracted(true);
}
```

入口包括：
- `handleTouchStart`
- `handleTouchMove`
- 选格/选色点击逻辑
- 双指缩放逻辑

- [ ] **Step 3: 接入工具条状态 helper**

在 `useMemo` 中读取：

```tsx
const mobileSingleBoardToolbarUi = useMemo(
  () =>
    getSingleBoardMobileToolbarState({
      isSingleBoardMobile,
      hasInteractedWithCanvas: singleBoardMobileCanvasInteracted,
    }),
  [isSingleBoardMobile, singleBoardMobileCanvasInteracted],
);
```

- [ ] **Step 4: 收起态下只保留轻入口**

收起态只保留：

```tsx
{mobileSingleBoardToolbarUi.collapsed ? (
  <button
    style={styles.singleBoardMobileToolbarHandle}
    onClick={() => setSingleBoardMobileCanvasInteracted(false)}
    title="展开工具"
  >
    工具
  </button>
) : (
  // 原四按钮条
)}
```

- [ ] **Step 5: 新增轻入口样式**

```tsx
singleBoardMobileToolbarHandle: {
  height: "22px",
  minWidth: "44px",
  padding: "0 8px",
  borderRadius: radius.full,
  border: `1px solid ${makingCandy.border}`,
  background: "rgba(255,255,255,0.78)",
  color: makingCandy.text,
  fontSize: "10px",
  fontWeight: 800,
  boxShadow: makingCandy.shadowSoft,
},
```

- [ ] **Step 6: 跑测试和构建**

Run:
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
- `cmd /c npm.cmd run build`

Expected:
- tests PASS
- build PASS

- [ ] **Step 7: 提交这一小步**

```bash
git add perler-beads/src/pages/mobile/MakingPage.tsx perler-beads/src/utils/singleBoardInteraction.js TEST/single_board_interaction.test.mjs
git commit -m "feat: auto-collapse mobile single-board toolbar"
```

### Task 5: MCP 回归、记录和发布前检查

**Files:**
- Create: `MD/client/2026-04-27_mobile_single_board_toolbar_overlay_fix.md`

- [ ] **Step 1: 写客户端 MD 记录**

记录内容包括：
- 遮挡根因
- 动态避让
- 半浮动工具条
- 自动收起逻辑
- MCP 结果

- [ ] **Step 2: 手机口径 MCP 回归**

验证：
- 单板模式下图纸不再被四按钮条遮挡
- 默认展开时四按钮仍可用
- 拖动/缩放/点图纸后工具条自动收起
- 点击轻入口后可重新展开

- [ ] **Step 3: 桌面口径 MCP 回归**

验证：
- `桌面工具区` 正常
- 不影响桌面侧边栏
- 不引入新控制台报错

- [ ] **Step 4: 运行最终验证**

Run:
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
- `cmd /c npm.cmd run build`

Expected:
- 全部通过

- [ ] **Step 5: 提交记录**

```bash
git add MD/client/2026-04-27_mobile_single_board_toolbar_overlay_fix.md
git commit -m "docs: add mobile toolbar overlay fix record"
```
