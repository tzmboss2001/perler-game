# 2026-04-01 编辑页去背景确认后自动返回编辑

## 问题
- 用户在背景处理模式中点击“确定”后，只会应用当前去背景结果，但仍停留在背景处理模式。
- 这不符合常见编辑流程，用户确认完成后通常应自动回到编辑图案页面继续后续操作。

## 修改
- 文件：`perler-beads/src/pages/mobile/EditorPage.tsx`
- 在 `handleBgConfirmTransparent` 中，应用透明结果后，追加以下状态收口：
  - `setBgCompareMode('current')`
  - `setBgBaselineData(null)`
  - `setBgViewMode('select')`
  - `setIsBackgroundMode(false)`
- 保持原有选区和提示清理逻辑不变。

## 结果
- 用户点击“确定”后，会：
  1. 应用当前去背景结果
  2. 清理背景处理模式的临时状态
  3. 自动返回编辑图案页面

## 验证
- `npm run build` 通过
