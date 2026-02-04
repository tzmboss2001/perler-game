# 编辑器页面布局优化

**日期**: 2026-01-24
**修改文件**: `src/pages/mobile/EditorPage.tsx`

## 需求概述

1. 移除右上角下载按钮（抖音兼容）
2. 预览图固定在顶部，滚动时始终可见
3. 编辑工具栏移到预览图下方
4. 控制卡片和按钮高度缩减，更紧凑

## 修改内容

### 1. 移除右上角下载按钮

Header 右侧从下载按钮改为空占位符：

```tsx
// 修改前
<button style={styles.downloadBtn} onClick={handleDownload}>
  <DownloadSimple size={20} weight="bold" />
</button>

// 修改后
<div style={styles.headerPlaceholder} />
```

### 2. 预览图 Sticky 定位

PreviewSection 设置为 sticky，固定在 header 下方：

```tsx
previewSection: {
  padding: '12px 16px 8px',
  background: colors.bg.secondary,
  borderBottom: `1px solid ${colors.border.soft}`,
  position: 'sticky',
  top: '50px', // header 高度
  zIndex: 98,
},
```

### 3. Container 滚动容器

修改 container 为滚动容器，确保 sticky 正常工作：

```tsx
container: {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: colors.bg.primary,
  overflowY: 'auto',
  overflowX: 'hidden',
},
```

### 4. 紧凑化样式调整

| 组件 | 修改前 | 修改后 |
|------|--------|--------|
| Header padding | 12px 16px | 10px 16px |
| ToolbarWrapper padding | 12px 16px | 8px 12px |
| ControlPanel padding | 16px | 12px |
| ControlItem marginBottom | 16px | 10px |
| BrandTab padding | 10px | 8px |
| StatsHeader padding | 14px 16px | 10px 12px |
| StatsList maxHeight | 240px | 160px |
| StatsItem padding | 8px 0 | 6px 0 |
| StatsColorBox size | 24px | 20px |
| Actions gap | 12px | 8px |
| 按钮 padding | 14px | 10px |

## 新布局结构

```
┌─────────────────────────────┐
│ Header (sticky)             │  ← 返回 | 标题 | (空)
├─────────────────────────────┤
│ PreviewSection (sticky)     │  ← Canvas预览图 + 尺寸信息
├─────────────────────────────┤
│ Toolbar (紧凑)              │  ← 颜色 | 工具 | 撤销重做
├─────────────────────────────┤
│ ScrollArea                  │
│  ├─ ControlPanel (紧凑)     │  ← 网格宽度、色板
│  ├─ StatsSection (紧凑)     │  ← 珠子统计（折叠）
│  └─ Actions (紧凑)          │  ← 重新选图 | 下载 | 开始制作
└─────────────────────────────┘
```

## 验证结果

- [x] 右上角无下载按钮
- [x] 上划时 Header 保持固定
- [x] 上划时预览图保持固定（在 Header 下方）
- [x] 工具栏在预览图下方
- [x] 整体布局紧凑，一屏可见更多内容
