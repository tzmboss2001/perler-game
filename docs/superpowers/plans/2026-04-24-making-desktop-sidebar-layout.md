# Making Desktop Sidebar Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在桌面宽屏浏览器下，为制作页引入右侧可折叠侧边栏，把总览和辅助工具迁出顶部，显著释放图纸区高度，同时保持手机端与窄屏布局不变。

**Architecture:** 在现有 `MakingPage.tsx` 内增加桌面宽屏布局分支，新增若干 helper 负责桌面宽屏判定、侧边栏尺寸和本地持久化字段。桌面宽屏下改用“顶部薄工具条 + 中间图纸主列 + 右侧可折叠侧边栏 + 底部极简状态条”结构；手机端与窄屏继续走原布局。

**Tech Stack:** React、TypeScript、内联样式对象、现有 `singleBoardInteraction.js` helper、Node test、Vite build、Chrome MCP

---

### Task 1: 定义桌面宽屏侧边栏 helper 与测试

**Files:**
- Modify: `TEST/single_board_interaction.test.mjs`
- Modify: `perler-beads/src/utils/singleBoardInteraction.js`

- [ ] **Step 1: 先写失败测试，锁定桌面宽屏布局判定和侧边栏尺寸规则**

```js
test("desktop making layout flags only enable sidebar on wide screens", () => {
  assert.deepEqual(
    getMakingDesktopLayoutFlags({
      viewMode: "singleBoard",
      viewportWidth: 1440,
      pointerFine: true,
    }),
    {
      isSingleBoardMobile: false,
      isSingleBoardDesktop: true,
      useDesktopSidebarLayout: true,
    },
  );
  assert.deepEqual(
    getMakingDesktopLayoutFlags({
      viewMode: "singleBoard",
      viewportWidth: 1100,
      pointerFine: true,
    }).useDesktopSidebarLayout,
    false,
  );
});

test("desktop sidebar layout returns legal expanded and collapsed widths", () => {
  const expanded = getMakingDesktopSidebarLayout({
    viewportWidth: 1440,
    collapsed: false,
  });
  const collapsed = getMakingDesktopSidebarLayout({
    viewportWidth: 1440,
    collapsed: true,
  });

  assert.equal(expanded.width, 264);
  assert.equal(collapsed.width, 40);
  assert.equal(expanded.contentPadding, 12);
  assert.equal(collapsed.contentPadding, 0);
});
```

- [ ] **Step 2: 跑测试，确认现在是红的**

Run: `node --test TEST\single_board_interaction.test.mjs`

Expected:
- 新增测试因为 helper 尚未定义而失败

- [ ] **Step 3: 在 helper 文件里补最小实现**

```js
export function getMakingDesktopLayoutFlags({
  viewMode,
  viewportWidth,
  pointerFine,
}) {
  const isSingleBoardMobile =
    viewMode === "singleBoard" && viewportWidth <= 640;
  const isSingleBoardDesktop =
    viewMode === "singleBoard" && viewportWidth > 640;
  const useDesktopSidebarLayout =
    viewportWidth >= 1280 && pointerFine === true;
  return {
    isSingleBoardMobile,
    isSingleBoardDesktop,
    useDesktopSidebarLayout,
  };
}

export function getMakingDesktopSidebarLayout({
  viewportWidth,
  collapsed,
}) {
  const expandedWidth = viewportWidth >= 1600 ? 280 : 264;
  return collapsed
    ? {
        width: 40,
        contentPadding: 0,
      }
    : {
        width: expandedWidth,
        contentPadding: 12,
      };
}
```

- [ ] **Step 4: 再跑测试，确认 helper 规则通过**

Run: `node --test TEST\single_board_interaction.test.mjs`

Expected:
- 新增 helper 测试通过

- [ ] **Step 5: 提交这一步**

```bash
git add TEST/single_board_interaction.test.mjs perler-beads/src/utils/singleBoardInteraction.js
git commit -m "test: add desktop sidebar layout helpers"
```

### Task 2: 为制作页加入桌面宽屏侧边栏布局状态

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`
- Test: `TEST/single_board_interaction.test.mjs`

- [ ] **Step 1: 在页面中增加桌面宽屏布局状态与本地字段常量**

```tsx
const MAKING_DESKTOP_SIDEBAR_STORAGE_KEY =
  "makingDesktopSidebarCollapsed";

const pointerFine = useMemo(() => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer:fine)").matches;
}, [viewportWidth]);

const {
  isSingleBoardMobile,
  isSingleBoardDesktop,
  useDesktopSidebarLayout,
} = useMemo(
  () =>
    getMakingDesktopLayoutFlags({
      viewMode,
      viewportWidth,
      pointerFine,
    }),
  [viewMode, viewportWidth, pointerFine],
);

const [makingDesktopSidebarCollapsed, setMakingDesktopSidebarCollapsed] =
  useState(false);
```

- [ ] **Step 2: 在现有本地偏好恢复 effect 中接入桌面侧边栏状态读取**

```tsx
const storedDesktopSidebarCollapsed = localStorage.getItem(
  MAKING_DESKTOP_SIDEBAR_STORAGE_KEY,
);
if (storedDesktopSidebarCollapsed === "1") {
  setMakingDesktopSidebarCollapsed(true);
}
if (storedDesktopSidebarCollapsed === "0") {
  setMakingDesktopSidebarCollapsed(false);
}
```

- [ ] **Step 3: 新增单独 effect，把折叠状态持久化**

```tsx
useEffect(() => {
  if (!useDesktopSidebarLayout) return;
  localStorage.setItem(
    MAKING_DESKTOP_SIDEBAR_STORAGE_KEY,
    makingDesktopSidebarCollapsed ? "1" : "0",
  );
}, [useDesktopSidebarLayout, makingDesktopSidebarCollapsed]);
```

- [ ] **Step 4: 跑已有测试，确认状态接线没有引入语法错误**

Run: `node --test TEST\single_board_interaction.test.mjs`

Expected:
- 全部测试通过

- [ ] **Step 5: 提交这一步**

```bash
git add perler-beads/src/pages/mobile/MakingPage.tsx
git commit -m "feat: add desktop sidebar layout state"
```

### Task 3: 搭出桌面宽屏右侧侧边栏壳子

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: 为桌面宽屏模式增加主工作区包裹结构**

```tsx
const desktopSidebarLayout = getMakingDesktopSidebarLayout({
  viewportWidth,
  collapsed: makingDesktopSidebarCollapsed,
});
```

```tsx
{useDesktopSidebarLayout ? (
  <div style={styles.makingDesktopWorkspaceShell}>
    <div style={styles.makingDesktopMainColumn}>
      {/* 现有顶部薄工具条 + canvas + 底部状态条 */}
    </div>
    <aside
      style={{
        ...styles.makingDesktopSidebar,
        width: desktopSidebarLayout.width,
      }}
    >
      {/* 侧边栏内容 */}
    </aside>
  </div>
) : (
  <>
    {/* 现有旧布局 */}
  </>
)}
```

- [ ] **Step 2: 增加折叠/展开按钮与窄边入口**

```tsx
<button
  style={styles.makingDesktopSidebarToggle}
  onClick={() =>
    setMakingDesktopSidebarCollapsed((prev) => !prev)
  }
>
  {makingDesktopSidebarCollapsed ? "展开工具" : "收起工具"}
</button>
```

```tsx
{makingDesktopSidebarCollapsed ? (
  <div style={styles.makingDesktopSidebarRail}>
    <button
      style={styles.makingDesktopSidebarRailBtn}
      onClick={() => setMakingDesktopSidebarCollapsed(false)}
    >
      工具
    </button>
  </div>
) : (
  <div style={styles.makingDesktopSidebarPanel}>{/* 模块内容 */}</div>
)}
```

- [ ] **Step 3: 给样式对象增加侧边栏壳子样式**

```tsx
makingDesktopWorkspaceShell: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "12px",
  alignItems: "stretch",
  minHeight: 0,
},

makingDesktopMainColumn: {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
},

makingDesktopSidebar: {
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
},
```

- [ ] **Step 4: 构建一次，确认桌面壳子接线正确**

Run: `npm.cmd run build`

Expected:
- build 成功

- [ ] **Step 5: 提交这一步**

```bash
git add perler-beads/src/pages/mobile/MakingPage.tsx
git commit -m "feat: add desktop making sidebar shell"
```

### Task 4: 把单板模式总览与板切换迁入右侧侧边栏

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: 在展开态侧边栏中放入单板模式总览卡片**

```tsx
{viewMode === "singleBoard" && (
  <section style={styles.makingDesktopSidebarSection}>
    <div style={styles.makingDesktopSidebarSectionTitle}>整图总览</div>
    <div style={styles.makingDesktopSidebarMiniMapCard}>
      <canvas
        ref={singleBoardMiniMapCanvasRef}
        onClick={(e) => handleOverviewCanvasClick(e)}
        style={{
          ...styles.singleBoardMiniMapCanvas,
          aspectRatio: beadData
            ? `${beadData.width} / ${beadData.height}`
            : "1 / 1",
        }}
      />
    </div>
  </section>
)}
```

- [ ] **Step 2: 把板块切换和未完成板迁入侧边栏**

```tsx
{viewMode === "singleBoard" && (
  <section style={styles.makingDesktopSidebarSection}>
    <div style={styles.makingDesktopSidebarSectionTitle}>板块切换</div>
    <div style={styles.makingDesktopSidebarBoardGrid}>
      {boardRects.map((board) => (
        <button
          key={board.boardNumber}
          style={{
            ...styles.singleBoardChip,
            ...(board.boardNumber === activeBoardNumber
              ? styles.singleBoardChipActive
              : {}),
          }}
          onClick={() => activateBoard(board.boardNumber, true)}
        >
          板{board.boardNumber}
        </button>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 3: 从桌面单板顶部移除已迁移的总览与板切换可见块**

```tsx
{!useDesktopSidebarLayout && !singleBoardOverviewCollapsed && (
  <div style={styles.singleBoardDesktopDenseRow}>
    {/* 旧的桌面总览区 */}
  </div>
)}
```

- [ ] **Step 4: 构建一次，确认侧边栏总览和板切换正常渲染**

Run: `npm.cmd run build`

Expected:
- build 成功

- [ ] **Step 5: 提交这一步**

```bash
git add perler-beads/src/pages/mobile/MakingPage.tsx
git commit -m "feat: move single-board overview into desktop sidebar"
```

### Task 5: 把桌面端设置、图纸和辅助工具迁入侧边栏

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: 在桌面侧边栏新增工具区，迁入图纸与辅助入口**

```tsx
<section style={styles.makingDesktopSidebarSection}>
  <div style={styles.makingDesktopSidebarSectionTitle}>工具</div>
  <div style={styles.makingDesktopSidebarToolList}>
    <button
      style={styles.makingDesktopSidebarToolBtn}
      onClick={handleOpenExport}
    >
      图纸导出
    </button>
    <button
      style={styles.makingDesktopSidebarToolBtn}
      onClick={() => setShowSettings((prev) => !prev)}
    >
      设置与辅助
    </button>
  </div>
</section>
```

- [ ] **Step 2: 把顶部右侧的桌面端次级按钮收缩为只保留核心动作**

```tsx
const shouldShowTopSecondaryTools =
  !useDesktopSidebarLayout || isSingleBoardMobile;
```

```tsx
{shouldShowTopSecondaryTools && (
  <div style={controlBtnsStyle}>
    {/* 旧按钮组 */}
  </div>
)}
```

- [ ] **Step 3: 让设置面板在桌面宽屏下优先锚定侧边栏区域**

```tsx
const settingsPanelStyle =
  useDesktopSidebarLayout && !makingDesktopSidebarCollapsed
    ? styles.settingsPanelDesktopSidebar
    : styles.settingsPanel;
```

- [ ] **Step 4: 构建一次，确认桌面端按钮迁移后无缺失入口**

Run: `npm.cmd run build`

Expected:
- build 成功

- [ ] **Step 5: 提交这一步**

```bash
git add perler-beads/src/pages/mobile/MakingPage.tsx
git commit -m "feat: move desktop making tools into sidebar"
```

### Task 6: 收薄顶部与底部，让图纸区继续吃高度

**Files:**
- Modify: `perler-beads/src/pages/mobile/MakingPage.tsx`

- [ ] **Step 1: 针对 `useDesktopSidebarLayout` 收紧顶部薄工具条间距**

```tsx
const desktopThinToolbarStyle = useDesktopSidebarLayout
  ? {
      gap: "6px",
      padding: "0",
    }
  : {};
```

- [ ] **Step 2: 针对 `useDesktopSidebarLayout` 收紧底部状态条**

```tsx
...(useDesktopSidebarLayout
  ? {
      padding: "4px 6px",
      gap: "6px",
      borderRadius: "10px",
    }
  : {})
```

- [ ] **Step 3: 桌面宽屏下进一步抬高 canvas 容器最小高度**

```js
if (useDesktopSidebarLayout) {
  return "clamp(620px, 84vh, 1100px)";
}
```

- [ ] **Step 4: 构建一次，确认布局收薄不会打断画布尺寸逻辑**

Run: `npm.cmd run build`

Expected:
- build 成功

- [ ] **Step 5: 提交这一步**

```bash
git add perler-beads/src/pages/mobile/MakingPage.tsx perler-beads/src/utils/singleBoardInteraction.js
git commit -m "feat: maximize desktop making canvas height"
```

### Task 7: MCP 桌面与手机回归验证

**Files:**
- Modify: `MD/client/2026-04-24_making_desktop_sidebar_layout.md`

- [ ] **Step 1: 桌面口径 MCP 验证单板模式**

Run in MCP:
- 打开 `http://127.0.0.1:3005/mobile/making`
- 视口设为桌面宽屏，例如 `1540x900`
- 进入单板模式
- 记录图纸区可见高度
- 验证右侧侧边栏默认展开
- 验证可折叠与重新展开

Expected:
- 中间图纸区明显高于当前版本
- 右侧工具区工作正常

- [ ] **Step 2: 桌面口径 MCP 验证传统模式**

Run in MCP:
- 切到传统模式
- 验证侧边栏仍可用
- 验证传统模式图纸区不退化

Expected:
- 传统模式可正常使用
- 顶部按钮没有丢失核心操作

- [ ] **Step 3: 手机口径 MCP 回归**

Run in MCP:
- 视口切到 `390x844`
- 验证手机端不启用右侧侧边栏
- 验证总览、缩放、完成按钮仍按原移动布局显示

Expected:
- 手机端布局无回归

- [ ] **Step 4: 更新客户端 MD 记录**

```md
## 验证

- 桌面宽屏下右侧侧边栏默认展开，可折叠，可重新展开
- 单板模式中间图纸区高度明显提升
- 传统模式无回归
- 手机端布局不变
```

- [ ] **Step 5: 提交这一步**

```bash
git add MD/client/2026-04-24_making_desktop_sidebar_layout.md
git commit -m "docs: record desktop sidebar layout verification"
```

## 自检

- spec 覆盖检查：
  - 桌面宽屏右侧可折叠侧边栏：Task 3
  - 单板模式总览/板切换迁移：Task 4
  - 工具迁移：Task 5
  - 顶部/底部收薄与图纸高度优先：Task 6
  - 折叠状态持久化：Task 2
  - MCP 桌面/手机回归：Task 7
- 占位检查：
  - 无 `TODO / TBD / later`
- 命名一致性：
  - `getMakingDesktopLayoutFlags`
  - `getMakingDesktopSidebarLayout`
  - `makingDesktopSidebarCollapsed`

