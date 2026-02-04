# 背景透明化工具

## 功能概述

在EditorPage添加"背景处理模式"，允许用户手动选择并透明化背景网格。适用于背景颜色简单（1-2种颜色）的场景。

## 用户场景

- 用户上传的图片有纯色背景
- 用户希望只制作主体部分，不需要背景的珠子
- 透明部分不计入珠子统计和购买清单

## 交互设计

### 入口
- EditorPage工具栏添加"魔棒"图标
- 点击进入"背景处理模式"

### 操作流程
1. **进入模式**：点击魔棒图标
2. **选择颜色**：点击任意网格，高亮所有同色号网格
3. **排除误选**：点击已高亮网格可取消高亮（保护主体上的同色区域）
4. **确认透明**：点击"确认透明"按钮，将剩余高亮网格设为透明
5. **多轮处理**：可重复步骤2-4处理多种背景色
6. **退出模式**：点击"退出"或完成处理

### UI设计
```
┌─────────────────────────────────────┐
│  ← 背景处理模式    [已选中 N 个网格] │  顶部提示栏
├─────────────────────────────────────┤
│                                     │
│         [图案预览区]                │  高亮显示选中的网格
│         棋盘格=已透明               │
│                                     │
├─────────────────────────────────────┤
│  [清除选择]  [确认透明]  [退出模式] │  底部操作栏
└─────────────────────────────────────┘
```

### 视觉效果
- **高亮网格**：添加边框或半透明覆盖层
- **已透明网格**：显示棋盘格底纹
- **已透明网格不可选中**

## 技术实现

### 数据结构
```typescript
// BeadColor 扩展，支持透明标记
interface BeadPixelData {
  width: number;
  height: number;
  beads: (BeadColor | null)[];  // null 表示透明
}
```

### EditorPage 状态扩展
```typescript
// 新增状态
const [isBackgroundMode, setIsBackgroundMode] = useState(false);
const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
```

### 核心逻辑

#### 1. 选择同色网格
```typescript
const handleSelectColor = (index: number) => {
  const bead = beadData.beads[index];
  if (!bead) return; // 已透明，不可选
  setSelectedColorId(bead.id);
  setExcludedIndices(new Set()); // 清空排除列表
};
```

#### 2. 排除/恢复单个网格
```typescript
const handleToggleExclude = (index: number) => {
  setExcludedIndices(prev => {
    const next = new Set(prev);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    return next;
  });
};
```

#### 3. 获取高亮网格列表
```typescript
const getHighlightedIndices = (): number[] => {
  if (!selectedColorId) return [];
  return beadData.beads
    .map((bead, index) => ({ bead, index }))
    .filter(({ bead, index }) =>
      bead &&
      bead.id === selectedColorId &&
      !excludedIndices.has(index)
    )
    .map(({ index }) => index);
};
```

#### 4. 确认透明化
```typescript
const handleConfirmTransparent = () => {
  const indices = getHighlightedIndices();
  const newBeads = [...beadData.beads];
  indices.forEach(i => {
    newBeads[i] = null; // 设为透明
  });
  setBeadData({ ...beadData, beads: newBeads });
  setSelectedColorId(null);
  setExcludedIndices(new Set());
};
```

### 珠子统计过滤
```typescript
// 统计时过滤掉 null（透明）
const colorCounts = beadData.beads
  .filter(bead => bead !== null)
  .reduce((acc, bead) => {
    acc[bead.id] = (acc[bead.id] || 0) + 1;
    return acc;
  }, {});
```

### Canvas 渲染
```typescript
// 透明网格渲染棋盘格
if (bead === null) {
  // 绘制棋盘格
  const checkSize = cellSize / 4;
  for (let cy = 0; cy < cellSize; cy += checkSize) {
    for (let cx = 0; cx < cellSize; cx += checkSize) {
      const isLight = ((cx / checkSize) + (cy / checkSize)) % 2 === 0;
      ctx.fillStyle = isLight ? '#ffffff' : '#cccccc';
      ctx.fillRect(x + cx, y + cy, checkSize, checkSize);
    }
  }
}
```

## 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `src/pages/mobile/EditorPage.tsx` | 添加背景处理模式、状态、UI |
| `src/components/InteractiveCanvas.tsx` | 支持高亮显示、透明网格渲染 |
| `src/pages/mobile/EditorPage.tsx` | 珠子统计过滤透明网格 |

## 测试用例

| 场景 | 预期结果 |
|------|----------|
| 点击魔棒进入模式 | 显示提示，底部显示操作栏 |
| 点击网格选择颜色 | 所有同色网格高亮 |
| 点击高亮网格排除 | 该网格取消高亮 |
| 再次点击被排除网格 | 恢复高亮 |
| 确认透明化 | 高亮网格变棋盘格，统计更新 |
| 点击棋盘格网格 | 无反应（不可选） |
| 多轮处理 | 可继续选择其他颜色透明化 |
| 退出模式 | 回到正常编辑 |
