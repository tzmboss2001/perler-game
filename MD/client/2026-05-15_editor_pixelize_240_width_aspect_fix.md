# 编辑页 240 宽图纸比例拉伸修复记录

## 背景

用户在手机端编辑图纸时选择 240 宽度，进入制作页后人物视觉上被拉长变瘦。现象在宽度数值越大时越明显。

## 根因

`pixelizeFromImage` 先使用用户输入的 `gridWidth` 计算高度，再把实际输出宽度限制到 `maxWidth = 200`。

当用户选择 240 宽时，会形成：

- 实际宽度：200
- 实际高度：按 240 的原图比例计算

最终导致输出图纸宽高比失真。

## 修改内容

1. 将 `perler-beads/src/services/pixelizeService.ts` 的服务端像素化宽度上限从 200 对齐到编辑页的 240。
2. 先计算 `finalWidth`，再用 `finalWidth` 计算等比高度，避免最终宽度和高度使用不同基准。
3. 新增 `TEST/pixelize_dimensions_contract.test.mjs`：
   - 验证 240 宽输出仍为 240。
   - 验证低于最小宽度时，高度也按最终夹紧后的宽度计算。

## 影响范围

- 影响编辑页重新生成图纸时的像素化尺寸。
- 影响 200 以上宽度图纸的真实输出尺寸和比例。
- 不直接修改颜色匹配、高亮、制作页点击、分板导出逻辑。

## 验证记录

- `cmd /c node --test TEST\pixelize_dimensions_contract.test.mjs`
- `cmd /c node --test TEST\pixelize_dimensions_contract.test.mjs TEST\editor_control_layout.test.mjs`
- `cmd /c npm run build -- --outDir ..\TEMP\pixelize_240_width_build --emptyOutDir`

结果：

- 新增尺寸 contract test：2 个用例通过。
- 编辑页控制布局相关测试：2 个用例通过。
- Vite 生产构建通过，仅保留项目已有的大 chunk 体积 warning。

## 回滚方法

1. 还原 `perler-beads/src/services/pixelizeService.ts` 中本次宽高计算修改。
2. 删除 `TEST/pixelize_dimensions_contract.test.mjs`。
3. 删除本记录文件。
4. 重新执行测试和构建。
