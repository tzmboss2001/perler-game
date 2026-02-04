# 制作页面混合模式优化

## 问题描述
用户在制作拼豆图案时，需要不同的辅助方式：
- 有些用户习惯逐行制作
- 有些用户习惯按区块制作

## 第二次优化 (2026-01-24)

### 新增功能
1. **区块大小可调** - 支持 5-10 之间的边长调整
2. **珠子矩阵完整显示** - 动态计算珠子尺寸，确保屏幕内完整显示

### 布局优化
- 预览区高度：28vh → 15vh
- 各区域 padding 压缩
- 区块模式下隐藏颜色统计以节省空间
- 珠子间隙：2px → 1px
- 珠子尺寸动态计算，考虑屏幕高度

### 区块大小控制 UI
```
[切换] 逐行 / 区块 10×10
                    边长: [−] 10 [+]
```

### 抖音小程序适配
- 右上角不放任何按钮，避免与胶囊按钮冲突
- 模式切换按钮移至模式指示器左侧

## 解决方案

### 混合模式实现
重写 `MakingPage.tsx`，支持两种制作模式：

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| 逐行模式 | 一行一行高亮显示 | 小尺寸图案、简单图案 |
| 区块模式 | 10×10 区块高亮显示 | 大尺寸图案、复杂图案 |

### 核心代码改动

#### 1. 新增类型和状态
```typescript
type MakingMode = 'row' | 'block';

const [mode, setMode] = useState<MakingMode>('row');
const [blockSize, setBlockSize] = useState(10);
```

#### 2. 区块计算逻辑
```typescript
const getCurrentBlockInfo = useCallback(() => {
  if (!beadData || mode !== 'block') return null;
  const blocksX = Math.ceil(beadData.width / blockSize);
  const blockX = currentIndex % blocksX;
  const blockY = Math.floor(currentIndex / blocksX);
  const startX = blockX * blockSize;
  const startY = blockY * blockSize;
  const endX = Math.min(startX + blockSize, beadData.width);
  const endY = Math.min(startY + blockSize, beadData.height);
  return { blockX, blockY, startX, startY, endX, endY, blocksX };
}, [beadData, mode, blockSize, currentIndex]);
```

#### 3. 珠子矩阵显示
- 逐行模式：返回单行珠子 `[[...colors]]`
- 区块模式：返回 10×10 矩阵 `[[row1], [row2], ...]`

#### 4. Canvas 渲染
- 逐行模式：高亮当前行（青色边框）
- 区块模式：高亮当前 10×10 区块（青色边框）

### UI 变化

#### 模式切换
- 头部添加模式切换按钮（网格/列表图标）
- 模式指示器显示当前模式：`逐行 / 区块 10×10`

#### 进度显示
- 逐行模式：`X / Y 行`
- 区块模式：`X / Y 块`

#### 珠子显示
- 逐行模式：横向排列
- 区块模式：网格矩阵排列

### 固定头部布局
使用 flex 布局实现固定头部：
```typescript
container: {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
},
header: {
  flexShrink: 0,  // 固定不收缩
},
mainContent: {
  flex: 1,
  overflowY: 'auto',  // 只有内容区滚动
},
```

## 测试结果

| 功能 | 状态 |
|------|------|
| 逐行模式显示 | ✅ 通过 |
| 区块模式显示 | ✅ 通过 |
| 模式切换 | ✅ 通过 |
| 导航功能 | ✅ 通过 |
| 进度更新 | ✅ 通过 |
| 固定头部 | ✅ 通过 |

## 修改文件
- `src/pages/mobile/MakingPage.tsx` - 完全重写，支持混合模式

## 日期
2026-01-24
