# 编辑器页面布局优化

## 修改日期
2026-01-23

## 修改文件
- `src/pages/mobile/EditorPage.tsx`

## 修改内容

### 1. 移除右上角下载按钮
- 删除 header 中的 downloadBtn
- 改为空占位符 `headerPlaceholder` 保持布局平衡
- 原因：抖音兼容性问题

### 2. 预览图固定在顶部
- `previewSection` 改为 `position: sticky`
- `top: 50px` (header 高度下方)
- 设置 `zIndex: 98`
- 添加背景色避免内容穿透

### 3. 工具栏移到预览图下方
- 从 sticky 改为普通定位
- 放在 previewSection 之后
- 减少 padding 更紧凑

### 4. 紧凑化样式调整

| 组件 | 修改前 | 修改后 |
|------|--------|--------|
| header padding | 12px 16px | 10px 16px |
| previewSection | 普通定位 | sticky 定位 |
| toolbarWrapper padding | 12px 16px | 8px 12px |
| controlPanel padding | 16px | 12px |
| controlItem marginBottom | 16px | 10px |
| brandTab padding | 10px | 8px |
| statsHeader padding | 14px 16px | 10px 12px |
| statsList maxHeight | 240px | 160px |
| statsItem padding | 8px 0 | 6px 0 |
| statsColorBox 尺寸 | 24px | 20px |
| actions gap | 12px | 8px |
| actions paddingBottom | 20px | 16px |
| 按钮 padding | 14px | 10px |
| 按钮 fontSize | md | sm |
| sizeInfo fontSize | sm | xs |

## 新布局结构

```
┌─────────────────────────────┐
│ Header (sticky, 紧凑)       │  ← 返回 | 标题 | (空)
├─────────────────────────────┤
│ PreviewSection (sticky)     │  ← Canvas预览图 + 尺寸信息
├─────────────────────────────┤
│ Toolbar (紧凑)              │  ← 颜色 | 工具 | 撤销重做
├─────────────────────────────┤
│ ScrollArea                  │
│  ├─ ControlPanel (紧凑)     │  ← 网格宽度、色板（单行）
│  ├─ StatsSection (紧凑)     │  ← 珠子统计（折叠）
│  └─ Actions (紧凑)          │  ← 重新选图 | 下载 | 开始制作
└─────────────────────────────┘
```

## 测试结果
- 编译成功
- 右上角无下载按钮
- 上划时预览图保持可见
- 工具栏在预览图下方
- 整体布局紧凑

---

## 追加修改：图片比例问题修复

### 问题描述
原实现对宽度和高度都限制最大 100，导致竖图（如 1:2 比例）被压扁。

### 修改方案（参考 perlerbeads 网站）
- 只限制宽度范围（10-100）
- 高度根据图片比例自动计算，不做限制

### 修改文件

**1. src/services/pixelizeService.ts**
```typescript
// 修改前
const maxSize = 100;
const finalWidth = Math.min(gridWidth, maxSize);
const finalHeight = Math.min(gridHeight, maxSize);

// 修改后
const minWidth = 10;
const maxWidth = 100;
const finalWidth = Math.max(minWidth, Math.min(gridWidth, maxWidth));
const finalHeight = gridHeight; // 高度不限制，保持原图比例
```

**2. src/pages/mobile/EditorPage.tsx**
```typescript
// 修改前
min="16" max="64"

// 修改后
min="10" max="100"
```

### 测试结果
- 竖图比例正确保持（测试图 32 x 78 = 2496 颗）
- 滑块范围已更新为 10-100

---

## 追加修改：制作模式添加色号显示

### 问题描述
制作模式只显示颜色名称，没有色号。国内拼豆玩家购买珠子时需要按色号搜索。

### 修改文件
- `src/pages/mobile/MakingPage.tsx`

### 修改内容
1. 颜色统计区域添加色号显示（紫色高亮）
2. 颜色序列的 title 提示添加色号

### 显示格式
```
[颜色块] A13 浅肤色 ×5
```

色号优先显示，方便用户购买和分拣珠子。

---

## 追加修改：缩放功能改为滑杆控制

### 问题描述
桌面端使用鼠标滚轮时，如果光标停留在预览图上会触发缩放，但用户可能只是想滚动页面，容易误触。

### 解决方案
移除滚轮缩放功能，改用滑杆控制缩放比例。

### 修改文件
- `src/components/InteractiveCanvas.tsx`

### 修改内容
1. 移除 wheel 事件监听（滚轮缩放）
2. 添加缩放滑杆（range: 50%-300%）
3. 保留 +/- 按钮和 1:1 重置按钮

### 新的缩放控制
```
[+] [====滑杆====] 100% [-] [1:1]
```

滚动页面时不再误触缩放，操作更直观。
