# 2026-03-19 编辑页色系色数切换不即时生效修复

## 问题
用户在编辑图案页的色系面板里切换 `96色`、`150色` 等色数时，预览图没有立即出现变化，导致看起来像色系选择无效。

## 根因
- 色数按钮原来只执行了 `setColorCount()`，只改了界面状态。
- 编辑页不会因为 `colorCount` 单独变化自动重新生成图案。
- 因此预览图仍然保持旧结果，用户看不到差异。

## 修复
- 文件：`perler-beads/src/pages/mobile/EditorPage.tsx`
- 新增 `handleApplyColorCount()`：
  - 点击色数标签时立即触发重新生成。
  - 重新生成时显式把这次点击的 `colorCount` 传入处理链路，不再依赖异步 state 更新。
- 同时把 `processImage()` 扩展为支持 `colorCount` 和 `customColorIds` 覆盖参数，保证本次点击参数立即参与颜色匹配。
- `lastAppliedParamsRef` 也加入 `colorCount`，避免确认弹窗取消后回退参数不完整。

## 结果
- 点击 `48色 / 72色 / 96色 / 150色 / 200色 / 全部` 时，预览图会立即按新的色数重生成。
- 用户能直接看到不同色数带来的颜色变化。

## 验证
- `cmd /c npm run build` 通过。
