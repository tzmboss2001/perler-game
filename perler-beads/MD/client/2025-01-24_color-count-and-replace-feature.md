# 拼豆工坊功能优化 - 颜色数量选择与颜色替换

## 修改日期
2025-01-24

## 修改概述
实现三个核心功能：
1. **按颜色数量选择**：替代原有的品牌选择，用户无需了解品牌差异，直接选择颜色数量
2. **颜色替换功能**：在统计列表中，用户可以将某个颜色替换为相近色
3. **简化度滑块**：0-100% 滑块控制颜色简化程度，更直观易懂

## 修改文件清单

### 1. src/data/beadColors.ts
**新增内容：**
- `ColorCountOption` 接口：颜色数量选项的类型定义
- `colorCountOptions` 常量：颜色数量选项配置（48/72/96/120/168色）
- `defaultColorCount` 常量：默认颜色数量（96色）

```typescript
export const colorCountOptions: ColorCountOption[] = [
  { count: 48, label: '48色', description: '简单快速' },
  { count: 72, label: '72色', description: '基础还原' },
  { count: 96, label: '96色', description: '中等细腻' },
  { count: 120, label: '120色', description: '高度还原' },
  { count: 168, label: '168色', description: '最细腻' },
];
```

### 2. src/services/colorMatchService.ts
**修改内容：**
- `ColorMatchOptions` 接口：`brand` 改为可选，新增 `colorCount` 属性
- `matchPixelsToBead` 函数：支持 `colorCount` 参数，使用统一色库
- 新增 `findNextSimilarColor` 函数：找下一个相近颜色，用于颜色替换

```typescript
export const findNextSimilarColor = (
  currentColorId: string,
  excludeIds: string[] = []
): BeadColor | null => {
  // 找到当前颜色，排除已尝试的颜色，返回最接近的颜色
};
```

### 3. src/pages/mobile/CreatePage.tsx
**修改内容：**
- 移除品牌选择相关代码（`selectedBrand`、`showBrandInfo` 等）
- 新增颜色数量选择（`colorCount` 状态）
- UI 改为**紧凑横向按钮**布局（一行显示 48/72/96/120/168）
- 导航参数从 `brand` 改为 `colorCount`

**2025-01-24 布局优化：**
- 原垂直卡片布局改为横向按钮布局
- 减少页面滚动，一屏可见所有操作

### 4. src/pages/mobile/EditorPage.tsx
**修改内容：**
- 接收参数从 `brand` 改为 `colorCount`
- 品牌选择标签页改为颜色数量选择标签页
- 新增 `replacedColors` 状态：记录已替换的颜色
- 新增 `handleReplaceColor` 函数：处理颜色替换
- 新增 `handleRestoreColor` 函数：恢复原颜色
- 统计列表每项添加"换"/"还原"按钮
- 新增替换按钮和还原按钮样式

### 5. src/components/ColorPicker.tsx
**修改内容：**
- `brand` 属性改为 `colorCount` 属性
- 使用统一色库 `allBeadColors` 替代品牌色库

## 数据流变化

### 修改前
```
CreatePage (选品牌) → EditorPage (品牌颜色匹配) → 统计显示
```

### 修改后
```
CreatePage (选颜色数量) → EditorPage (统一色库+颜色数量限制) → 统计显示+替换按钮
```

## UI 变化

### CreatePage 颜色数量选择
```
┌─────────────────────────────────────┐
│ 选择颜色数量                         │
│ 颜色越多，图案还原度越高              │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 48色          ✓                 │ │
│ │ 简单快速                        │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 72色                            │ │
│ │ 基础还原                        │ │
│ └─────────────────────────────────┘ │
│ ...                                  │
└─────────────────────────────────────┘
```

### EditorPage 统计列表
```
┌───────────────────────────────────────────┐
│ 1. 🔴 红色    45颗   10.5%    [换]       │
│ 2. 🟡 黄色    32颗    7.5%    [换]       │
│ 3. 🔵 蓝色    28颗    6.5%    [还原]     │  ← 已替换
└───────────────────────────────────────────┘
```

## 验证步骤
1. 启动开发服务器 `npm run dev`
2. 访问创建页面，确认显示颜色数量选项
3. 选择图片和颜色数量，生成图案
4. 在编辑页确认颜色数量选择和替换功能

## 技术说明
- 使用统一色库 `allBeadColors`（168色），根据用户选择的 `colorCount` 进行颜色合并
- 颜色替换使用欧氏距离找最接近颜色
- 支持多次连续替换，记录替换历史以便恢复

## 功能3：简化度滑块（已隐藏）

> **状态**: 2025-01-24 暂时隐藏此功能

### 功能说明
参考 pixelbeads 网站的"颜色合并"功能，改为更直观的"简化度"百分比：
- **滑块范围**: 0-100%
- **0%**: 保留全部细节
- **25%**: 轻度简化
- **50%**: 适度简化
- **75%**: 较多简化
- **100%**: 大幅简化

### 代码状态
代码已实现但 UI 被注释隐藏，相关代码保留在 EditorPage.tsx 中，如需启用可取消注释。

---

## 2025-01-24 布局优化更新

### 优化内容

#### 1. CreatePage 颜色数量选择
- 垂直卡片布局 → 横向紧凑按钮布局
- 一行显示所有选项（48/72/96/120/168）
- 减少页面滚动

#### 2. EditorPage 编辑器优化
- **编辑按钮修复**：移除 minWidth，添加 flexShrink: 0，确保完整显示
- **颜色数量选择隐藏**：用户已在创建页选择，编辑页不再重复显示
- **整体布局紧凑化**：减小 padding、gap、fontSize

#### 3. 珠子统计布局优化
- 字体大小：11px（名称）、10px（序号、按钮）
- 间距：gap: 4px, padding: 4px 0
- 色块：16x16px
- 按钮：padding: 2px 6px

#### 4. 颜色替换功能增强
- **支持多次连续替换**：用户可以多次点击"换"尝试不同颜色
- **单色还原**："原"按钮恢复单个颜色到初始状态
- **还原全部**：一键恢复所有颜色到初始状态

### 新增状态
```typescript
// 保存初始数据，用于"还原全部"
const [initialBeadData, setInitialBeadData] = useState<BeadPixelData | null>(null);
```

### UI 示例
```
┌──────────────────────────────────────────────────┐
│ 1  █ 白色      711   29.0%   [换]               │
│ 2  █ 薄雾灰    568   23.2%   [换] [原]          │  ← 已替换
│ 3  █ 奶油糖色  223    9.1%   [换]               │
│ ...                                              │
│              [ 还原全部 ]                        │  ← 有替换时显示
└──────────────────────────────────────────────────┘
```

### 验证结果
- ✅ 编辑按钮完整显示
- ✅ 颜色数量选择已隐藏
- ✅ 珠子统计布局紧凑，所有元素在屏幕宽度内
- ✅ 颜色替换功能正常
- ✅ 单色还原功能正常
- ✅ 还原全部功能正常

---

## 2025-01-24 工具栏与滑杆优化

### 问题修复

#### 1. 编辑工具栏撤销/重做按钮显示不全
**原因**: 工具栏元素尺寸过大，`historyGroup` 的 `marginLeft: auto` 导致按钮被推出屏幕

**修复** (`EditorToolbar.tsx`):
- 移除 `historyGroup` 的 `marginLeft: auto`
- 减小容器 padding: `10px 12px` → `8px 10px`
- 减小 gap: `8px` → `4px`
- 减小按钮尺寸:
  - colorPreview: `24px` → `20px`
  - toolButton: `36px` → `32px`
  - historyButton: `32px` → `28px`

#### 2. 网格宽度滑杆导致页面"刷新"效果
**原因**: `handleRegenerate` 调用 `processImage()` 时:
1. 显示 loading 状态（闪烁）
2. 重置 `initialBeadData` 和 `replacedColors`

**修复** (`EditorPage.tsx`):
- `processImage` 新增 `isRegenerate` 参数
- 重新生成时 (`isRegenerate=true`):
  - 不显示 loading 状态
  - 不重置初始数据
  - 不重置替换记录
- `handleRegenerate` 调用 `processImage(true)`

```typescript
const processImage = useCallback(async (isRegenerate: boolean = false) => {
  // 只有首次加载才显示loading
  if (!isRegenerate) {
    setIsProcessing(true);
  }
  // ...
  // 仅首次加载时保存初始数据和重置替换记录
  if (!isRegenerate) {
    setInitialBeadData(JSON.parse(JSON.stringify(beads)));
    setReplacedColors(new Map());
  }
});
```

### 验证结果
- ✅ 工具栏所有按钮（P01、画笔、填充、橡皮、吸色、撤销、重做）完整显示
- ✅ 网格宽度滑杆调整时不再显示加载动画
- ✅ 调整网格宽度后不会重置颜色替换记录

---

## 2025-01-24 预览区高度固定

### 问题
改变网格宽度时，预览图区域的高度也随之变化，导致页面布局跳动。

### 修复
修改 `InteractiveCanvas.tsx` 的 `container` 样式，设置固定高度：

```typescript
container: {
  height: '45vh',      // 固定高度
  minHeight: '45vh',   // 防止缩小
  maxHeight: '45vh',   // 防止放大
  overflow: 'auto',    // 内容超出时显示滚动条
  // ...其他样式
}
```

### 效果
- 预览区高度始终为 45vh
- 网格尺寸变化时，图片在固定区域内滚动
- 页面布局稳定，不再跳动

---

## 2025-01-24 色号显示与高亮功能

### 新增功能

#### 1. 珠子统计显示色号
在统计列表中显示颜色编码（如 P01、P47、A33 等），方便用户购买对应颜色的珠子。

```typescript
// 统计列表显示
<span style={styles.statsColorId}>{stat.color.id}</span>
```

#### 2. 颜色高亮功能
点击统计列表中的颜色行，对应颜色的所有珠子在画布上高亮显示（金色边框）。

**实现方式**：
- `highlightedColorId` 状态追踪当前高亮的颜色
- `InteractiveCanvas` 组件接收高亮颜色ID
- Canvas 渲染时为匹配颜色绘制金色边框

```typescript
// 高亮渲染
if (bead.id === highlightedColorId) {
  ctx.strokeStyle = '#FFD700'; // 金色边框
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
}
```

#### 3. 多次换色支持
修复只能换色一次的问题，支持同一颜色多次循环替换。

**实现方式**：
- `triedColorsMap` 状态追踪每个初始颜色尝试过的所有颜色
- 换色时排除所有已尝试过的颜色

```typescript
// 获取已尝试的颜色列表
const triedColors = triedColorsMap.get(initialColorId) || [initialColorId];
// 找下一个相近色（排除已尝试的）
const nextColor = findNextSimilarColor(colorId, triedColors);
```

#### 4. 换色后取消高亮
点击"换"按钮后自动取消高亮，让用户清晰看到换色效果。

### 交互流程
1. 用户点击统计列表中的颜色行 → 该颜色珠子高亮
2. 用户点击"换"按钮 → 颜色替换，高亮消失
3. 用户可多次点击"换"循环尝试不同颜色
4. 用户点击"原"按钮 → 恢复到初始颜色

### 新增样式
- `statsColorId`: 色号文字样式
- `statsItemHighlighted`: 高亮选中行样式

### 修改文件
- `src/pages/mobile/EditorPage.tsx` - 状态管理和逻辑
- `src/components/InteractiveCanvas.tsx` - 高亮渲染

### 验证结果
- ✅ 统计列表显示色号（P01、P47、A33等）
- ✅ 点击颜色行，对应珠子高亮显示
- ✅ 支持多次换色循环
- ✅ 换色后高亮自动消失
- ✅ 还原功能正常工作
