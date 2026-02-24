# MARD 色号体系集成

## 修改日期
2026-02-24

## 修改概述
将项目默认色板从 Artkal 174色 替换为 MARD 291色（国内拼豆圈最主流品牌），使项目对国内用户更实用。

## 修改内容

### 1. `src/data/beadColors.ts`
- **扩展 brand 类型**：`'perler' | 'hama' | 'artkal'` → `'perler' | 'hama' | 'artkal' | 'mard'`
- **新增 `mardColors` 数组**（291色），数据来源：https://pixel-beads.com/mard-bead-color-chart
  - A系列 26色（黄橙色系）
  - B系列 32色（绿色系）
  - C系列 29色（青蓝色系）
  - D系列 26色（紫色系）
  - E系列 24色（粉色系）
  - F系列 25色（红色系）
  - G系列 21色（棕色肤色系）
  - H系列 23色（黑白灰色系）
  - M系列 15色（莫兰迪色系）
  - P系列 23色（粉彩系）
  - Q系列 5色（荧光色系）
  - R系列 28色（新色系）
  - T系列 1色（透明色）
  - Y系列 5色（夜光色）
  - ZG系列 8色（中灰色系）
- **修改 `allBeadColors`**：从 `artkalColors` 改为 `mardColors`
- **更新 `getColorsByBrand()`**：添加 `'mard'` 分支
- **更新 `colorCountOptions`**：`[48, 72, 96, 150, 200, 291]`（原 `[48, 72, 96, 120, 174]`）
- **更新 `defaultColorCount`**：`150`（原 `96`）
- 保留原有 perlerColors / hamaColors / artkalColors 不删除（向后兼容）

### 2. `src/components/ColorReplaceModal.tsx`
- `import { perlerColors }` → `import { allBeadColors }`
- 所有 `perlerColors` 引用改为 `allBeadColors`

### 3. `src/services/3d/voxelService.ts`
- `import { artkalColors }` → `import { allBeadColors }`
- 颜色匹配使用 `allBeadColors`（MARD 色库）

### 4. `src/services/3d/sliceService.ts`
- `import { artkalColors }` → `import { allBeadColors }`
- 切片服务使用 `allBeadColors`

### 5. `src/pages/mobile/MakingPage.tsx`
- `import { perlerColors }` → `import { allBeadColors }`
- 颜色查找使用 `allBeadColors`

## 影响范围
- 图案生成时的颜色匹配将使用 MARD 291色
- 颜色替换弹窗显示 MARD 色号
- 3D模型转图纸使用 MARD 色库
- 颜色数量选择器显示新选项（最大 291）
- 默认颜色数量从 96 改为 150

## 验证方式
1. `npm run build` 编译通过
2. 创建页面颜色数量选择器显示 6 个选项
3. 生成图案后颜色统计显示 MARD 色号（A1, B2, C3...）
4. 颜色替换弹窗正常工作
