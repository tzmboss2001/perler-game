# MARD 色库体系对齐现实方案 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让系统只保留现实世界的 `MARD 221 常用色` 和 `MARD 291 全色` 两种官方方案，把“我的颜色”独立成用户库存层，并把现有 `48 / 72 / 96 / 150 / 200` 改造成算法精简控制项而不是官方方案。

**Architecture:** 在数据层把“基础色库”和“颜色数量上限”拆成两套结构；在编辑页把基础色库来源与算法精简控制解耦；在帮助页、引导页和分析推荐中统一语义。兼容旧项目时，把旧的 `colorCount` 视为“颜色数量上限”，缺失新字段时默认回退到 `MARD 291 全色`。

**Tech Stack:** React、TypeScript、现有本地测试 `node --test`、Vite build。

---

## 文件结构

- 修改: `perler-beads/src/data/beadColors.ts`
  - 定义 `mard221Colors`
  - 定义基础色库选项
  - 重新定义颜色数量上限选项文案和结构
- 修改: `perler-beads/src/services/colorMatchService.ts`
  - 让颜色匹配显式接收基础色库候选集
- 修改: `perler-beads/src/pages/mobile/EditorPage.tsx`
  - 拆分“基础色库来源”和“颜色数量上限”状态
  - 替换旧 UI 文案和逻辑
  - 增加旧草稿兼容
- 修改: `perler-beads/src/services/imageAnalysisService.ts`
  - 保留推荐颜色数量能力，但语义改为“推荐上限”
- 修改: `perler-beads/src/services/myColorsService.ts`
  - 仅在需要时增加类型或辅助方法，不改云同步协议
- 修改: `perler-beads/src/pages/mobile/HelpPage.tsx`
  - 替换帮助文案
- 修改: `perler-beads/src/components/OnboardingModal.tsx`
  - 替换引导文案
- 新增: `TEST/mard_palette_alignment.test.mjs`
  - 覆盖数据层和兼容逻辑
- 可能修改: `perler-beads/src/utils/...`
  - 如果需要抽出旧草稿兼容 helper，新增一个小工具文件
- 新增: `MD/client/2026-04-25_mard_palette_alignment.md`
  - 记录本次修改

---

### Task 1: 定义基础色库和精简控制的数据结构

**Files:**
- Modify: `perler-beads/src/data/beadColors.ts`
- Test: `TEST/mard_palette_alignment.test.mjs`

- [ ] **Step 1: 写失败测试，锁定 MARD 221 / 291 与精简控制的基本结构**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mardColors,
  mard221Colors,
  officialPaletteOptions,
  colorLimitOptions,
} from '../perler-beads/src/data/beadColors.js';

test('MARD 官方色库应暴露 221 和 291 两种方案', () => {
  assert.equal(mardColors.length, 291);
  assert.equal(mard221Colors.length, 221);
  assert.deepEqual(
    officialPaletteOptions.map((item) => item.id),
    ['mard-221', 'mard-291']
  );
});

test('颜色精简选项应表达为上限控制而不是官方方案', () => {
  assert.deepEqual(
    colorLimitOptions.map((item) => item.count),
    [48, 72, 96, 150, 200, 291]
  );
  assert.ok(colorLimitOptions.every((item) => item.label.includes('色')));
  assert.ok(colorLimitOptions.some((item) => item.id === 'limit-none'));
});
```

- [ ] **Step 2: 运行测试，确认当前失败**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: FAIL，提示 `mard221Colors` 或 `officialPaletteOptions` / `colorLimitOptions` 未定义。

- [ ] **Step 3: 在数据层补齐最小实现**

```ts
export interface OfficialPaletteOption {
  id: 'mard-221' | 'mard-291';
  label: string;
  description: string;
  colors: BeadColor[];
}

export interface ColorLimitOption {
  id: string;
  count: number;
  label: string;
  description: string;
}

export const mard221Colors: BeadColor[] = mardColors.slice(0, 221);

export const officialPaletteOptions: OfficialPaletteOption[] = [
  {
    id: 'mard-221',
    label: 'MARD 221 常用色',
    description: '现实世界常用色盘',
    colors: mard221Colors,
  },
  {
    id: 'mard-291',
    label: 'MARD 291 全色',
    description: '现实世界完整色盘',
    colors: mardColors,
  },
];

export const colorLimitOptions: ColorLimitOption[] = [
  { id: 'limit-48', count: 48, label: '最多 48 色', description: '强力精简' },
  { id: 'limit-72', count: 72, label: '最多 72 色', description: '明显精简' },
  { id: 'limit-96', count: 96, label: '最多 96 色', description: '适中精简' },
  { id: 'limit-150', count: 150, label: '最多 150 色', description: '保留较多细节' },
  { id: 'limit-200', count: 200, label: '最多 200 色', description: '轻度精简' },
  { id: 'limit-none', count: 291, label: '不限制', description: '使用当前基础色库全部颜色' },
];
```

- [ ] **Step 4: 兼容旧导出名称**

```ts
export const colorCountOptions = colorLimitOptions;
export const defaultColorCount = 150;
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add TEST/mard_palette_alignment.test.mjs perler-beads/src/data/beadColors.ts
git commit -m "feat: define official mard palette options"
```

### Task 2: 让编辑页区分基础色库来源和颜色数量上限

**Files:**
- Modify: `perler-beads/src/pages/mobile/EditorPage.tsx`
- Modify: `perler-beads/src/data/beadColors.ts`
- Test: `TEST/mard_palette_alignment.test.mjs`

- [ ] **Step 1: 写失败测试，锁定旧项目兼容默认行为**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePaletteSelection,
} from '../perler-beads/src/data/beadColors.js';

test('旧项目缺少基础色库字段时应默认回退到 MARD 291', () => {
  const result = normalizePaletteSelection({
    colorCount: 96,
    paletteMode: undefined,
    customColorIds: [],
  });

  assert.equal(result.paletteMode, 'mard-291');
  assert.equal(result.colorLimit, 96);
});

test('启用我的颜色时应保持我的颜色模式', () => {
  const result = normalizePaletteSelection({
    colorCount: 150,
    paletteMode: 'my-colors',
    customColorIds: ['A1', 'A2'],
  });

  assert.equal(result.paletteMode, 'my-colors');
  assert.equal(result.colorLimit, 150);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: FAIL，提示 `normalizePaletteSelection` 未定义。

- [ ] **Step 3: 在 `beadColors.ts` 增加兼容 helper**

```ts
export type PaletteMode = 'mard-221' | 'mard-291' | 'my-colors';

export interface PaletteSelectionState {
  paletteMode: PaletteMode;
  colorLimit: number;
}

export const normalizePaletteSelection = ({
  colorCount,
  paletteMode,
  customColorIds,
}: {
  colorCount?: number;
  paletteMode?: PaletteMode;
  customColorIds?: string[];
}): PaletteSelectionState => {
  const nextLimit = colorCount && Number.isFinite(colorCount) ? colorCount : defaultColorCount;
  if (paletteMode === 'my-colors' && (customColorIds?.length || 0) > 0) {
    return { paletteMode: 'my-colors', colorLimit: nextLimit };
  }

  if (paletteMode === 'mard-221' || paletteMode === 'mard-291') {
    return { paletteMode, colorLimit: nextLimit };
  }

  return { paletteMode: 'mard-291', colorLimit: nextLimit };
};
```

- [ ] **Step 4: 编辑页接入新的状态语义**

```ts
const normalizedPaletteSelection = React.useMemo(
  () =>
    normalizePaletteSelection({
      colorCount: initialColorCount,
      paletteMode: (mergedStateData as EditorResumeDraft & { paletteMode?: PaletteMode }).paletteMode,
      customColorIds,
    }),
  [initialColorCount, mergedStateData, customColorIds]
);

const [paletteMode, setPaletteMode] = useState<PaletteMode>(normalizedPaletteSelection.paletteMode);
const [colorCount, setColorCount] = useState<number>(normalizedPaletteSelection.colorLimit);
```

- [ ] **Step 5: 用新状态驱动色库来源**

```ts
const activePaletteColors = React.useMemo(() => {
  if (paletteMode === 'mard-221') return mard221Colors;
  if (paletteMode === 'mard-291') return mardColors;
  return allBeadColors;
}, [paletteMode]);
```

- [ ] **Step 6: 保存草稿时补上新字段**

```ts
const draftPayload = {
  ...existingDraft,
  paletteMode,
  colorCount,
};
```

- [ ] **Step 7: 运行测试，确认通过**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add perler-beads/src/data/beadColors.ts perler-beads/src/pages/mobile/EditorPage.tsx TEST/mard_palette_alignment.test.mjs
git commit -m "feat: split palette mode from color limit"
```

### Task 3: 把编辑页 UI 改成“官方色库 + 我的颜色 + 精简控制”

**Files:**
- Modify: `perler-beads/src/pages/mobile/EditorPage.tsx`
- Test: `TEST/mard_palette_alignment.test.mjs`

- [ ] **Step 1: 写失败测试，锁定选项文案**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  officialPaletteOptions,
  colorLimitOptions,
} from '../perler-beads/src/data/beadColors.js';

test('官方色库文案应只包含 221 和 291', () => {
  assert.deepEqual(
    officialPaletteOptions.map((item) => item.label),
    ['MARD 221 常用色', 'MARD 291 全色']
  );
});

test('精简控制文案不应再叫系统色系', () => {
  assert.ok(colorLimitOptions.every((item) => item.label.includes('最多') || item.label === '不限制'));
});
```

- [ ] **Step 2: 运行测试，确认失败或部分失败**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: 若文案尚未切齐，应 FAIL。

- [ ] **Step 3: 替换编辑页色系弹层的基础色库区**

```tsx
<div style={styles.paletteSection}>
  <div style={styles.paletteSectionHeader}>
    <span style={styles.paletteSectionTitle}>官方色库</span>
  </div>
  <div style={styles.colorCountTabs}>
    {officialPaletteOptions.map((opt) => (
      <button
        key={opt.id}
        style={{
          ...styles.colorCountTab,
          ...(paletteMode === opt.id ? styles.colorCountTabActive : {}),
        }}
        onClick={() => setPaletteMode(opt.id)}
      >
        <span>{opt.label}</span>
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 4: 把“我的颜色”改成基础色库来源之一**

```tsx
<div style={styles.paletteSection}>
  <div style={styles.paletteSectionHeader}>
    <span style={styles.paletteSectionTitle}>个人库存</span>
  </div>
  <div style={styles.paletteSwitchRow}>
    <div style={styles.paletteSwitchInfo}>
      <span style={styles.paletteSwitchTitle}>我的颜色</span>
      {myColorCount > 0 && <span style={styles.paletteSwitchBadge}>{myColorCount} 色</span>}
    </div>
    <div style={styles.paletteSwitchActions}>
      <button style={styles.paletteManageBtn} onClick={() => setShowMyColorsModal(true)}>管理</button>
      <button
        style={{
          ...styles.paletteUseBtn,
          ...(paletteMode === 'my-colors' ? styles.paletteUseBtnActive : {}),
        }}
        onClick={() => setPaletteMode('my-colors')}
      >
        启用
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 5: 把旧的 `系统色系` 区改成 `颜色精简`**

```tsx
<div style={styles.paletteSection}>
  <div style={styles.paletteSectionHeader}>
    <span style={styles.paletteSectionTitle}>颜色精简</span>
  </div>
  <div style={styles.colorCountTabs}>
    {colorLimitOptions.map((opt) => (
      <button
        key={opt.id}
        style={{
          ...styles.colorCountTab,
          ...(colorCount === opt.count ? styles.colorCountTabActive : {}),
        }}
        onClick={() => handleApplyColorCount(opt.count)}
      >
        <span>{opt.label}</span>
      </button>
    ))}
  </div>
  <div style={styles.paletteModeHint}>
    在当前基础色库范围内限制最终使用的颜色数量。
  </div>
</div>
```

- [ ] **Step 6: 运行测试，确认通过**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: PASS

- [ ] **Step 7: Build 验证 UI 改动可编译**

Run: `cmd /c npm.cmd run build`  
Expected: exit code 0

- [ ] **Step 8: Commit**

```bash
git add perler-beads/src/pages/mobile/EditorPage.tsx perler-beads/src/data/beadColors.ts TEST/mard_palette_alignment.test.mjs
git commit -m "feat: align editor palette UI with official mard schemes"
```

### Task 4: 统一帮助页和引导页文案

**Files:**
- Modify: `perler-beads/src/pages/mobile/HelpPage.tsx`
- Modify: `perler-beads/src/components/OnboardingModal.tsx`
- Test: `TEST/mard_palette_alignment.test.mjs`

- [ ] **Step 1: 写失败测试，锁定帮助文案关键词**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('帮助页文案应提到 MARD 221 和 MARD 291', () => {
  const helpText = fs.readFileSync('perler-beads/src/pages/mobile/HelpPage.tsx', 'utf8');
  assert.ok(helpText.includes('MARD 221'));
  assert.ok(helpText.includes('MARD 291'));
});

test('引导文案不应再只写固定 291 色默认口径', () => {
  const onboardingText = fs.readFileSync('perler-beads/src/components/OnboardingModal.tsx', 'utf8');
  assert.ok(onboardingText.includes('MARD 官方色库'));
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: FAIL

- [ ] **Step 3: 修改帮助页教程文案**

```tsx
description: '当前支持 MARD 官方色库，可选择 221 常用色或 291 全色；也可进一步限制颜色数量。'
```

- [ ] **Step 4: 修改帮助页 FAQ**

```tsx
answer: '当前系统支持 MARD 官方色库两种方案：221 常用色和 291 全色；如果你管理了自己的库存，也可以只使用“我的颜色”。'
```

- [ ] **Step 5: 修改引导页文案**

```tsx
title: 'MARD 官方色库',
description: '支持 MARD 221 常用色与 291 全色\n也支持只使用我的颜色'
```

- [ ] **Step 6: 运行测试，确认通过**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add perler-beads/src/pages/mobile/HelpPage.tsx perler-beads/src/components/OnboardingModal.tsx TEST/mard_palette_alignment.test.mjs
git commit -m "docs: align palette copy with official mard schemes"
```

### Task 5: 调整图像分析和推荐语义

**Files:**
- Modify: `perler-beads/src/services/imageAnalysisService.ts`
- Test: `TEST/mard_palette_alignment.test.mjs`

- [ ] **Step 1: 写失败测试，锁定推荐语义为“颜色上限”**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('图像分析服务中的推荐颜色说明应表达为上限语义', () => {
  const source = fs.readFileSync('perler-beads/src/services/imageAnalysisService.ts', 'utf8');
  assert.ok(source.includes('recommendedColorCount'));
  assert.ok(source.includes('颜色'));
});
```

- [ ] **Step 2: 运行测试，确认是否失败**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: 若文案或注释语义未更新，应 FAIL。

- [ ] **Step 3: 修改分析结果注释和命名语义**

```ts
recommendedColorCount: number; // 推荐颜色上限
```

- [ ] **Step 4: 修改涉及推荐文案的展示点**

```ts
// 推荐在当前基础色库下使用的颜色数量上限
```

- [ ] **Step 5: 运行测试和 build**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs && npm.cmd run build`  
Expected: tests PASS, build PASS

- [ ] **Step 6: Commit**

```bash
git add perler-beads/src/services/imageAnalysisService.ts TEST/mard_palette_alignment.test.mjs
git commit -m "refactor: clarify recommended color limit semantics"
```

### Task 6: 兼容历史项目与“我的颜色”边界行为

**Files:**
- Modify: `perler-beads/src/pages/mobile/EditorPage.tsx`
- Modify: `perler-beads/src/services/myColorsService.ts`
- Test: `TEST/mard_palette_alignment.test.mjs`

- [ ] **Step 1: 写失败测试，覆盖边界行为**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';

import { clampColorLimitByPaletteSize } from '../perler-beads/src/data/beadColors.js';

test('MARD 221 下颜色上限不能超过 221', () => {
  assert.equal(clampColorLimitByPaletteSize('mard-221', 291, 0), 221);
});

test('我的颜色模式下颜色上限不能超过用户库存数', () => {
  assert.equal(clampColorLimitByPaletteSize('my-colors', 150, 18), 18);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: FAIL，提示 `clampColorLimitByPaletteSize` 未定义。

- [ ] **Step 3: 在数据层增加上限钳制 helper**

```ts
export const clampColorLimitByPaletteSize = (
  paletteMode: PaletteMode,
  colorLimit: number,
  myColorCount: number
): number => {
  if (paletteMode === 'mard-221') return Math.min(colorLimit, 221);
  if (paletteMode === 'mard-291') return Math.min(colorLimit, 291);
  return Math.min(colorLimit, Math.max(myColorCount, 0));
};
```

- [ ] **Step 4: 编辑页实际应用这个钳制逻辑**

```ts
const effectiveColorLimit = clampColorLimitByPaletteSize(paletteMode, colorCount, myColorCount);
```

- [ ] **Step 5: 处理“我的颜色为空”时的 UX**

```ts
if (paletteMode === 'my-colors' && myColorCount === 0) {
  toast.show('请先在“我的颜色”中选择至少一种颜色');
  setShowMyColorsModal(true);
  return;
}
```

- [ ] **Step 6: 运行测试与 build**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: PASS

Run: `cmd /c npm.cmd run build`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add perler-beads/src/data/beadColors.ts perler-beads/src/pages/mobile/EditorPage.tsx perler-beads/src/services/myColorsService.ts TEST/mard_palette_alignment.test.mjs
git commit -m "feat: add palette limit compatibility guards"
```

### Task 7: 完整验证并记录修改

**Files:**
- Create: `MD/client/2026-04-25_mard_palette_alignment.md`
- Test: `TEST/mard_palette_alignment.test.mjs`

- [ ] **Step 1: 新增修改记录**

```md
# 2026-04-25 MARD 色库体系对齐现实方案

## 变更摘要
- 官方方案只保留 MARD 221 / MARD 291
- 我的颜色独立成用户库存层
- 颜色数量改成精简控制项
- 帮助页与引导页文案同步

## 验证
- `cmd /c node --test TEST\\mard_palette_alignment.test.mjs`
- `cmd /c npm.cmd run build`
```

- [ ] **Step 2: 跑完整验证**

Run: `cmd /c node --test TEST\mard_palette_alignment.test.mjs`  
Expected: 全部 PASS

Run: `cmd /c npm.cmd run build`  
Expected: build 成功

- [ ] **Step 3: 若条件允许，做 MCP 页面级回归**

Run:
- 打开编辑页
- 检查“官方色库 / 我的颜色 / 颜色精简”区块是否正确
- 检查帮助页和引导页文案是否正确

Expected:
- 不再出现把 `48 / 72 / 96 / 150 / 200` 当作官方方案的 UI 表达

- [ ] **Step 4: Commit**

```bash
git add MD/client/2026-04-25_mard_palette_alignment.md
git commit -m "docs: add mard palette alignment record"
```

---

## Self-Review

### Spec coverage

- 官方方案只保留 221 / 291：Task 1, 2, 3
- 我的颜色作为独立层：Task 2, 3, 6
- 算法档位改成精简控制项：Task 1, 3, 5
- 帮助文案和引导文案统一：Task 4
- 旧项目兼容：Task 2, 6
- 测试与记录：Task 1-7

### Placeholder scan

- 已检查，无 `TODO / TBD / implement later`
- 每个任务都给了文件、命令、期望结果和代码片段

### Type consistency

- `PaletteMode` 统一使用 `'mard-221' | 'mard-291' | 'my-colors'`
- `colorLimit` 统一表示算法上限
- `officialPaletteOptions` 和 `colorLimitOptions` 分开，避免语义混用

---

Plan complete and saved to `docs/superpowers/plans/2026-04-25-mard-palette-alignment.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
