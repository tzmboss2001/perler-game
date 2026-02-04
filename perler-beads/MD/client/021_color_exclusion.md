# 颜色排除功能

## 日期
2026-01-25

## 功能描述
在编辑器页面的珠子统计列表中，用户可以排除某些颜色，这些颜色在重新生成时不会被使用。

### 使用场景
- 用户没有某种颜色的珠子
- 用户不想使用某种颜色
- 简化图案的颜色种类

## 实现文件

### 修改文件
- `src/pages/mobile/EditorPage.tsx` - 添加排除颜色状态和UI
- `src/services/colorMatchService.ts` - 已有 excludeColors 支持

## 技术实现

### 状态管理
```typescript
const [excludedColorIds, setExcludedColorIds] = useState<Set<string>>(new Set());
```

### 排除/取消排除处理
```typescript
const handleToggleExcludeColor = useCallback((colorId: string) => {
  setExcludedColorIds(prev => {
    const next = new Set(prev);
    if (next.has(colorId)) {
      next.delete(colorId);
    } else {
      next.add(colorId);
    }
    return next;
  });
}, []);
```

### 颜色匹配时应用排除
```typescript
let beads = matchPixelsToBead(pixels, {
  colorCount,
  useLabSpace: true,
  saturationBoost,
  vibrancyPreference,
  excludeColors: Array.from(excludedColorIds), // 排除的颜色
});
```

### UI 元素

#### 排除按钮（每个颜色项）
- 默认状态：显示禁止图标，点击排除
- 排除状态：显示勾选图标，红色高亮，点击取消排除

#### 排除提示（简化设计）
- 当有颜色被排除时，显示提示文字
- 提示内容："已排除 N 种颜色，调整参数时自动应用"
- 排除的颜色会在用户调整任何参数（颜色数、饱和度等）后自动生效

**设计说明**: 原设计有独立的"应用排除"按钮，但与"换色"功能重复，故简化为被动提示。

## 样式

```typescript
excludeBtn: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2px 4px',
  marginLeft: '2px',
  background: 'transparent',
  border: `1px solid ${colors.text.muted}30`,
  borderRadius: '4px',
  cursor: 'pointer',
  color: colors.text.muted,
},

excludeBtnActive: {
  background: `linear-gradient(145deg, ${colors.bead.red}20, ${colors.bead.red}10)`,
  border: `1px solid ${colors.bead.red}50`,
  color: colors.bead.red,
},

excludeHint: {
  width: '100%',
  padding: '6px 8px',
  marginTop: '6px',
  background: `${colors.bead.red}10`,
  borderRadius: '6px',
  fontSize: '11px',
  fontFamily: typography.fontFamilyAlt,
  color: colors.bead.red,
  textAlign: 'center',
}
```

## 测试结果
| 测试项 | 结果 |
|--------|------|
| 排除按钮显示 | ✅ 每个颜色项都有排除按钮 |
| 点击排除 | ✅ 按钮变为"取消排除"，显示红色高亮 |
| 排除提示显示 | ✅ 显示"已排除 N 种颜色，调整参数时自动应用" |
| 调整参数后生效 | ✅ 排除的颜色在重新生成时不会出现 |

## 截图
- `TEMP/color_exclude_buttons.png` - 排除按钮显示
- `TEMP/color_excluded.png` - 选中排除后的状态（含提示文字）
