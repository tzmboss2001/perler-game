# 修复制作界面高亮边框不可见问题

## 日期
2024年

## 问题描述
在制作界面（MakingPage）：
1. **区块选择模式**（< 250%缩放）：选中10×10区块后，青色高亮边框不显示
2. **颜色选择模式**（≥ 250%缩放）：选中颜色后，同色格子的青色高亮边框不显示

## 问题原因

### 问题1：颜色高亮边框被网格线覆盖
颜色高亮边框在网格线**之前**绘制，导致被网格线覆盖而不可见。

绘制顺序（修复前）：
1. 绘制珠子颜色
2. 绘制颜色高亮边框 ← 在这里
3. 绘制网格线 ← 覆盖了边框
4. 绘制区块高亮边框

### 问题2：边框太细
- 区块高亮：`lineWidth = Math.max(3, scale * 1.5)` 在100%缩放下只有3像素
- 颜色高亮：`lineWidth = Math.max(2, scale * 0.8)` 在250%缩放下只有2像素

## 解决方案

### 1. 调整绘制顺序
将颜色高亮边框移到网格线**之后**绘制：

```typescript
// 绘制网格线...

// 选中区块时，绘制高亮边框（网格线之后）
if (selection.type === 'block') { ... }

// 选中颜色时，绘制高亮边框（网格线之后）
if (selection.type === 'color') { ... }
```

### 2. 增加边框宽度和发光效果

区块高亮边框：
```typescript
ctx.strokeStyle = '#00FFFF';
ctx.lineWidth = Math.max(5, scale * 2);  // 更粗
ctx.shadowColor = '#00FFFF';
ctx.shadowBlur = 4;  // 发光效果
```

颜色高亮边框：
```typescript
ctx.strokeStyle = '#00FFFF';
ctx.lineWidth = Math.max(4, scale * 1.5);  // 更粗
ctx.shadowColor = '#00FFFF';
ctx.shadowBlur = 2;  // 发光效果
```

## 涉及文件
- `src/pages/mobile/MakingPage.tsx`

## 效果
修复后：
- ✅ 区块选择模式：选中区块有明显的青色高亮边框和发光效果
- ✅ 颜色选择模式：同色格子有明显的青色高亮边框
- ✅ 非选中区域有半透明遮罩
- ✅ 统计数正确显示
