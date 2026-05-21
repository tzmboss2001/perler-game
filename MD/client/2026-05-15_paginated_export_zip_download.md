# 2026-05-15 分板图纸导出改为 ZIP 一次下载

## 背景

安卓华为自带浏览器真机测试发现：多板分页导出时，浏览器会连续弹出多个下载确认框，但只能点击最后一个下载框，前面的下载框会消失，导致只下载最后一块板。

## 根因

原分页导出逻辑在前端循环触发多个 `<a download>`：

1. overview PNG
2. board1 PNG
3. board2 PNG
4. ...

移动浏览器，尤其是部分安卓厂商浏览器，不稳定支持一次用户操作内连续多个下载提示。后弹出的提示会覆盖前面的提示。

## 修改内容

1. 新增 ZIP 工具：
   - 文件：`perler-beads/src/utils/zipExport.js`
   - 函数：
     - `buildPaginatedZipFilename({ width, height, timestamp })`
     - `calculateCrc32(bytes)`
     - `createStoredZipBlob(files)`
   - 实现方式：无新增 npm 依赖，使用 store-method ZIP。PNG 已压缩，不再二次压缩，降低手机 CPU 压力。

2. 修改导出弹窗：
   - 文件：`perler-beads/src/components/ExportModal.tsx`
   - 普通导出仍然是单张 PNG。
   - 分页导出改为：
     - 生成 overview PNG blob（如果开启）
     - 生成 board1~N PNG blob
     - 打包为一个 ZIP blob
     - 只触发一次下载

3. 更新分页导出提示：
   - 从“预计导出 N 张分板图纸”调整为“将下载 1 个 ZIP 压缩包，内含 N 张分板图纸...”

4. 新增测试：
   - `TEST/zip_export.test.mjs`
   - `TEST/paginated_zip_download_smoke.mjs`
   - 更新 `TEST/export_modal_visual_contract.test.mjs`

5. 补充设计和计划文档：
   - `docs/superpowers/specs/2026-05-15-paginated-export-zip-download-design.md`
   - `docs/superpowers/plans/2026-05-15-paginated-export-zip-download.md`

## 验证结果

- `cmd /c node --test TEST\zip_export.test.mjs`
  - 结果：`2/2` 通过。
- `cmd /c node --test TEST\export_modal_visual_contract.test.mjs`
  - 结果：`2/2` 通过。
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
  - 结果：`52/52` 通过。
- `cmd /c npm run build -- --outDir ..\TEMP\deploy_dist_clean --emptyOutDir`
  - 结果：构建通过。
  - 说明：仍有 Vite chunk size warning，是体积提示，不是错误。
- `cmd /c node TEST\paginated_zip_download_smoke.mjs`
  - 结果：通过。
  - 下载文件：`TEMP/paginated-zip-download-smoke/perler-60x30-boards-20260515.zip`
  - ZIP 内容：
    - `perler-60x30-board1-p1of2-20260515.png`
    - `perler-60x30-board2-p2of2-20260515.png`

## 影响范围

- 影响分页打印版导出方式：从多个 PNG 连续下载，改为一个 ZIP 下载。
- 不影响普通单张 PNG 导出。
- 不影响图纸渲染内容、分板顺序、board 文件名、overview 文件名、高亮、换色、完成状态、自动跳下一板。

## 真机验证建议

1. 安卓华为浏览器导出多板图纸。
2. 确认只弹出一个下载框。
3. 下载文件应为 `.zip`。
4. 解压后确认 board1~N 顺序完整。
5. 单板模式下确认 ZIP 内包含 overview + board1~N。
6. 普通非分页导出仍应是单张 PNG。

## 回滚方法

1. 恢复 `ExportModal.tsx` 分页导出循环下载 PNG 的逻辑。
2. 移除 `zipExport.js` 和对应测试。
3. 重新构建并发布正式域名。
