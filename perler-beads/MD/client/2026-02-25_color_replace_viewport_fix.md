# 替换颜色后画面跳位修复（2026-02-25）

## 问题
在制作模式中，用户放大图片并选中某个颜色后，点击"替换颜色"按钮替换成新颜色时，预览画面会跳位（不再保持当前缩放和位置），而是重置到初始状态。

## 原因
`MakingPage.tsx` 中有一个 `useEffect` 监听 `[beadData]` 变化来计算初始缩放：

```typescript
useEffect(() => {
  if (beadData) {
    // 重新计算 fitScale 并 setScale(...)
  }
}, [beadData]);
```

当 `handleColorReplace` 调用 `setBeadData({...beadData, beads: newBeads})` 时，生成了新的 `beadData` 对象，触发这个 effect 重新计算 `scale`，导致缩放被重置，画面跳位。

## 修复
添加 `initialScaleSetRef` 标记，确保缩放只在首次加载时计算一次：

```typescript
const initialScaleSetRef = useRef(false);
useEffect(() => {
  if (beadData && !initialScaleSetRef.current) {
    initialScaleSetRef.current = true;
    // 计算初始缩放...
  }
}, [beadData]);
```

## 修改文件
| 文件 | 改动 |
|------|------|
| `MakingPage.tsx` | 缩放初始化 useEffect 加 ref 守卫，只执行一次 |

## 验证
- 放大 → 选中颜色 → 替换颜色 → 画面保持当前缩放和位置不变 ✅
- `npm run build` 编译通过 ✅
