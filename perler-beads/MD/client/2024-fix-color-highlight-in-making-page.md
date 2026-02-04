# 修复制作界面颜色高亮不显示问题

## 日期
2024年

## 问题描述
在制作界面（MakingPage），放大后点击一个格子：
- 统计数显示正确（如"区块28颗 / 全部244颗"）
- 但视觉上没有高亮效果：
  - 同色格子没有青色边框
  - 非高亮区域没有半透明遮罩

## 问题原因
`getColorIndicesInBlock` 函数使用 `useCallback` 并依赖 `selection` 状态：

```javascript
const getColorIndicesInBlock = useCallback((colorHex: string): number[] => {
  if (!beadData || selection.type !== 'color') return [];
  // 使用 selection.blockX 和 selection.blockY
  ...
}, [beadData, selection]);
```

由于 React 状态更新的时序问题，当 `selection` 改变时：
1. `setSelection()` 被调用
2. React 开始异步更新状态
3. `useEffect` 可能在 `useCallback` 更新之前执行
4. 导致 `getColorIndicesInBlock` 内部的 `selection` 还是旧值
5. `selection.type !== 'color'` 判断为 true，返回空数组

## 解决方案
修改 `getColorIndicesInBlock` 函数，直接传入 `blockX` 和 `blockY` 参数，而不是从闭包中读取：

```javascript
// 修改前
const getColorIndicesInBlock = useCallback((colorHex: string): number[] => {
  if (!beadData || selection.type !== 'color') return [];
  const startX = selection.blockX * BLOCK_SIZE;
  const startY = selection.blockY * BLOCK_SIZE;
  ...
}, [beadData, selection]);

// 修改后
const getColorIndicesInBlock = useCallback((colorHex: string, blockX: number, blockY: number): number[] => {
  if (!beadData) return [];
  const startX = blockX * BLOCK_SIZE;
  const startY = blockY * BLOCK_SIZE;
  ...
}, [beadData]);
```

调用时传入明确的参数：
```javascript
getColorIndicesInBlock(selection.colorHex, selection.blockX, selection.blockY)
```

## 涉及文件
- `src/pages/mobile/MakingPage.tsx`

## 修改点
1. `getColorIndicesInBlock` 函数签名改为接收 `blockX` 和 `blockY` 参数
2. 移除函数内部的 `selection.type !== 'color'` 检查（调用方已检查）
3. 添加 null 检查：`if (bead && bead.hex === colorHex)`
4. 更新所有调用处传入参数

## 效果
修复后，点击格子时：
- ✅ 当前区块内所有同色格子显示青色高亮边框
- ✅ 非高亮区域显示半透明遮罩
- ✅ 统计数正确显示
