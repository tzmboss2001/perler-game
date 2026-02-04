# 制作模式界面重新设计

## 日期
2026-01-26

## 问题描述
用户反馈制作模式界面需要改进：
1. 浏览区域不够大
2. 需要更灵活的进度计算方式
3. 需要支持在逐行和区块模式间切换时正确计算进度

## 解决方案

### 1. 全屏预览设计
- 预览区几乎满屏
- 头部精简（只有返回按钮和标题）
- 底部只保留3个按钮：`<` | `完成局部并继续` | `>`
- 所有其他控件作为浮动元素放在预览区内

### 2. 进度按珠子计算
核心改进：使用 `Set<number>` 存储已完成的珠子索引，确保：
- 每颗珠子只计算一次
- 切换模式时自动处理重叠

```typescript
// 核心状态：已完成的珠子索引
const [completedBeads, setCompletedBeads] = useState<Set<number>>(new Set());

// 进度计算
const totalBeads = beadData.width * beadData.height;
const progress = (completedBeads.size / totalBeads) * 100;
```

### 3. 提示模式
三种模式可选：
- **无提示** - 不显示高亮引导
- **逐行** - 逐行高亮提示
- **区块** - 按区块(默认10x10)高亮提示

### 4. 重叠珠子处理示例
假设 30x30 矩阵（900颗珠子）：
1. 完成第一行：30颗 → 进度 = 30/900 = 3.3%
2. 切换到区块模式，完成第一区块(10x10=100颗)：
   - 重叠：10颗（第一行的前10颗）
   - 新增：100 - 10 = 90颗
   - 总计：30 + 90 = 120颗
   - 进度 = 120/900 = 13.3%

## 修改的文件

### MakingPage.tsx (完全重写)
主要变更：
1. **状态管理**：
   - `completedBeads: Set<number>` - 已完成珠子索引
   - `guideMode: 'none' | 'row' | 'block'` - 提示模式
   - `showCompleted: boolean` - 显示/隐藏已完成高亮

2. **布局**：
   - 头部：精简（40px高）
   - 预览区：flex:1 填满剩余空间
   - 底部导航：3个按钮（64px高）

3. **浮动控件**（预览区内）：
   - 顶部左侧：缩放控制 (0.5x ~ 10x)
   - 顶部右侧：功能按钮（屏幕常亮、显示已完成、设置）
   - 底部：进度条
   - 居中：位置提示（仅在有提示模式时显示）

4. **设置面板**：
   - 提示模式选择
   - 区块大小调整（5-20）

## 新增样式

| 样式名 | 说明 |
|--------|------|
| `floatingControls` | 浮动控制栏容器 |
| `zoomControls` | 缩放按钮组 |
| `controlBtns` | 功能按钮组 |
| `settingsPanel` | 设置面板 |
| `progressBar` | 进度条容器 |
| `positionHint` | 位置提示 |
| `canvasWrapper` | 画布容器（绝对定位，居中显示） |

## 交互说明

| 操作 | 效果 | Toast 提示 |
|------|------|------------|
| **单指拖动** (移动端) | 平移画布查看不同区域 | - |
| **双指捏合** (移动端) | 缩放画布 (0.5x ~ 10x) | - |
| **鼠标左键拖动** (桌面) | 平移画布查看不同区域 | - |
| **鼠标滚轮** (桌面) | 缩放画布 (0.5x ~ 10x) | - |
| 点击 +/- | 缩放画布 (0.5x ~ 10x) | - |
| 点击闪电图标 | 切换屏幕常亮 | "屏幕常亮已开启/关闭" |
| 点击眼睛图标 | 切换已完成高亮显示 | "已完成区域：显示/隐藏高亮" |
| 点击齿轮图标 | 打开/关闭设置面板 | - |
| 选择提示模式 | 切换无提示/逐行/区块模式 | - |
| 点击 < / > | 上一个/下一个行或区块 | - |
| 点击"完成局部并继续" | 标记当前区域完成并移动到下一个 | - |

### 屏幕常亮功能说明
- **用途**：制作时保持屏幕不熄灭
- **兼容性**：Chrome(Android)完全支持，iOS需添加到主屏幕
- **限制**：切换APP或标签页时自动释放

## 测试结果

| 场景 | 预期结果 | 测试状态 |
|------|----------|----------|
| 全屏预览布局 | 预览区几乎满屏 | ✅ 通过 |
| 画布居中显示 | 小于容器时居中 | ✅ 通过 |
| 逐行模式 | 按行高亮，正确计算进度 | ✅ 通过 |
| 区块模式 | 按区块高亮，正确计算进度 | ✅ 通过 |
| 模式切换进度 | 重叠珠子不重复计算 | ✅ 通过 |
| 已完成高亮 | 绿色遮罩显示已完成区域 | ✅ 通过 |

## 测试模式

访问 `/mobile/making?test=1` 可使用测试数据进入制作模式（无需生成图案）

## 拖动功能优化 (2026-01-27)

### 问题
当图片小于容器时，用户无法拖动预览图（因为没有滚动空间）

### 解决方案
使用 `transform: translate()` 替代滚动来实现拖动：

```typescript
// 状态
const [translateX, setTranslateX] = useState(0);
const [translateY, setTranslateY] = useState(0);

// 拖动处理
const handleMouseMove = useCallback((e: React.MouseEvent) => {
  if (!isDragging || !lastTouchRef.current) return;

  const deltaX = e.clientX - lastTouchRef.current.x;
  const deltaY = e.clientY - lastTouchRef.current.y;

  setTranslateX(prev => prev + deltaX);
  setTranslateY(prev => prev + deltaY);

  lastTouchRef.current = { x: e.clientX, y: e.clientY };
}, [isDragging]);

// Canvas 应用 transform
<canvas style={{ transform: `translate(${translateX}px, ${translateY}px)` }} />
```

### 效果
- 图片大于容器时：可拖动查看不同区域
- 图片小于容器时：也可任意拖动位置

## 色号显示优化 (2026-01-27)

### 问题
色号在不同缩放倍数下显示大小不合适，需要：
- 随着放大倍数逐渐出现
- 字体大小比网格小且舒适

### 解决方案

```typescript
// 绘制色号（缩放后格子足够大时显示）
const scaledCellSize = cellSize * scale;
const minSizeForColorId = 24; // 开始显示色号的最小屏幕像素尺寸
const fullOpacitySize = 40; // 完全不透明的屏幕像素尺寸

if (showColorId && scaledCellSize >= minSizeForColorId) {
  // 目标：屏幕上显示的字体大小为格子的 40%，范围 8px ~ 16px
  const displayFontSize = Math.max(8, Math.min(16, scaledCellSize * 0.4));
  // 转换为 canvas 坐标系的字体大小，最小4px保证清晰度
  const canvasFontSize = Math.max(4, displayFontSize / scale);

  // 透明度：从 minSizeForColorId 到 fullOpacitySize 之间渐变
  const opacity = Math.min(1, (scaledCellSize - minSizeForColorId) / (fullOpacitySize - minSizeForColorId));

  ctx.font = `bold ${canvasFontSize}px "PingFang SC", -apple-system, sans-serif`;
  // ... 绘制逻辑
}
```

### 核心改进：直接绘制目标尺寸

**之前的问题**：使用 CSS transform scale 放大 canvas，导致文字模糊

**新方案**：直接在目标尺寸绘制 canvas，不使用 CSS 缩放

```typescript
// 基础格子尺寸（固定）
const baseCellSize = 10;
// 实际绘制尺寸 = 基础尺寸 * 缩放比例
const drawCellSize = baseCellSize * scale;

// Canvas 尺寸随 scale 变化
canvas.width = width * drawCellSize;
canvas.height = height * drawCellSize;

// 字体大小：格子的 40%，范围 10px ~ 20px
const fontSize = Math.max(10, Math.min(20, drawCellSize * 0.4));
```

### 关键参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `baseCellSize` | 10px | 基础格子尺寸 |
| `drawCellSize` | baseCellSize * scale | 实际绘制尺寸 |
| `minSizeForColorId` | 24px | 开始显示色号的尺寸 |
| `fullOpacitySize` | 40px | 色号完全不透明的尺寸 |
| `fontSize` | 10-20px | 字体大小（格子的40%） |

### 效果
- 低倍缩放（<24px格子）：不显示色号
- 中倍缩放（24-40px格子）：色号逐渐淡入
- 高倍缩放（>40px格子）：色号清晰显示，**文字不再模糊**

## 优点

1. **预览区更大**：几乎满屏显示，画布自动缩放填满高度
2. **操作更简洁**：底部只有3个核心按钮
3. **进度更准确**：按珠子计算，支持模式切换
4. **灵活的提示**：可选无提示/逐行/区块
5. **不遮挡视线**：所有控件浮动且半透明
6. **自动适配**：画布默认填满可视高度，可水平滚动
7. **移动端兼容**：使用 `window.innerHeight` 动态计算高度，适配 iOS 安全区域
8. **色号舒适**：色号随放大逐渐出现，大小比例合适
