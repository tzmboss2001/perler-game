# 颜色数量选择与颜色替换功能

## 功能概述

参考 pixelbeads 网站的设计，实现两个核心功能：

### 功能1：按颜色数量选择（替代品牌选择）
- 用户不需要了解品牌差异
- 简单选择颜色数量：48/72/96/120/168 色
- 颜色越多 = 图案越细腻

### 功能2：颜色替换功能
- 在统计列表中，用户可以替换某个颜色
- 场景：用户买不到某颜色，一键换成相近色
- 支持多次替换和还原

---

## 实现详情

### 1. beadColors.ts
```typescript
export const colorCountOptions = [
  { count: 48, label: '48色', description: '简单快速' },
  { count: 72, label: '72色', description: '基础还原' },
  { count: 96, label: '96色', description: '中等细腻' },
  { count: 120, label: '120色', description: '高度还原' },
  { count: 168, label: '168色', description: '最细腻' },
];

export const defaultColorCount = 96;
```

### 2. colorMatchService.ts
```typescript
// 支持 colorCount 参数
export interface ColorMatchOptions {
  brand?: 'perler' | 'hama' | 'artkal';  // 可选，向后兼容
  colorCount?: number;                    // 新增：颜色数量
  // ...其他选项
}

// 找下一个相近颜色
export const findNextSimilarColor = (
  currentColorId: string,
  excludeIds: string[] = []
): BeadColor | null => {
  // ...实现
};
```

### 3. CreatePage.tsx
- 用户选择图片后显示颜色数量选项
- 默认 96 色
- 提示"越多越细腻"

### 4. EditorPage.tsx
- 统计列表每行显示"换"按钮
- 点击"换"：替换为相近颜色
- 被替换的颜色显示"原"按钮
- 支持"还原全部"功能

---

## UI 效果

### CreatePage 颜色数量选择
```
┌─────────────────────────────────┐
│ 🎨 颜色数量        越多越细腻   │
├─────────────────────────────────┤
│ [48] [72] [96✓] [120] [168]    │
└─────────────────────────────────┘
```

### EditorPage 统计列表
```
┌─────────────────────────────────────────┐
│ 1. 🟣 A46 堇紫    158  15.4%  [换]     │
│ 2. 🟢 P44 橄榄绿   80   7.8%  [换]     │
│ 3. 🔴 A51 猩红     78   7.6%  [换]     │
└─────────────────────────────────────────┘

点击"换"后：
┌─────────────────────────────────────────┐
│ 1. 🟣 A08 紫色    170  16.6%  [换][原] │  ← 可还原
│ 2. 🟢 P44 橄榄绿   80   7.8%  [换]     │
└─────────────────────────────────────────┘
```

---

## 验证结果

| 功能 | 状态 |
|------|------|
| 颜色数量选择 (48/72/96/120/168) | ✅ 通过 |
| 颜色替换功能 | ✅ 通过 |
| 单个颜色还原 | ✅ 通过 |
| 还原全部功能 | ✅ 通过 |

---

## 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/data/beadColors.ts` | 添加 `colorCountOptions` 配置 |
| `src/services/colorMatchService.ts` | 添加 `findNextSimilarColor` 函数 |
| `src/pages/mobile/CreatePage.tsx` | 品牌选择 → 颜色数量选择 |
| `src/pages/mobile/EditorPage.tsx` | 添加颜色替换和还原功能 |

---

## 日期
2026-01-24
