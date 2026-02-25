# 三个严重问题修复（2026-02-25）

## 问题1：编辑器调参丢失手动编辑

### 问题
用户在编辑器中手动调整珠子颜色后，拖动"网格宽度"或"鲜艳度"滑块松手时，会立即重新生成图案，所有手动编辑丢失且无任何提示。

### 修复
在 `handleRegenerate()` 中检查 `canUndo`（撤销栈是否有记录），如果有手动编辑则弹出 `confirm` 对话框。用户取消时恢复滑块到上次生成时的值。

### 修改文件
- `EditorPage.tsx` — 新增 `lastAppliedParamsRef`，`handleRegenerate` 加确认逻辑

---

## 问题2：采购清单品牌硬编码为 "Artkal"

### 问题
`EditorPage.tsx` 中 `ShoppingListModal` 的 `brand` 属性写死为 `"Artkal"`，但系统已切换到 MARD 291色体系，导致采购清单显示错误品牌。

### 修复
新增 `dominantBrand` useMemo，统计 beadData 中出现最多的品牌，动态传给 ShoppingListModal。

### 修改文件
- `EditorPage.tsx` — 新增品牌检测逻辑，`brand="Artkal"` → `brand={dominantBrand}`

---

## 问题3：ProfilePage 请求未正确取消（内存泄漏）

### 问题
ProfilePage 创建了 `AbortController` 并在组件卸载时调用 `abort()`，但信号从未传给 `projectApi.getList()`。导致快速进出页面时，已卸载组件的网络请求仍在执行。

### 修复
1. `projectApi.ts` 的 `request()` 函数支持外部传入 `signal`，通过 `addEventListener('abort')` 联动内部 controller
2. `getList()` 方法新增可选 `signal` 参数
3. `ProfilePage.tsx` 将 `controller.signal` 传入 `getList()`

### 修改文件
- `projectApi.ts` — `request()` 支持外部 signal 联动；`getList()` 加 signal 参数
- `ProfilePage.tsx` — 传入 `controller.signal`

---

## 验证
- `npm run build` 编译通过 ✅
