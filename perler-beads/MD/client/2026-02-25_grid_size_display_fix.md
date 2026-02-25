# 网格尺寸显示修正（2026-02-25）

## 问题
多处页面将图案尺寸显示为"64×64"，但实际图案是宽度64、高度按图片比例计算（如64×84）。原因是 `settings.gridSize` 只存了宽度，显示时被当成宽×高都用了同一个值。

## 涉及3个问题点

### 1. 模板详情页 — `TemplateDetailPage.tsx`
- **旧**：`{template.grid_width} × {template.grid_height}`（API 可能返回错误的相同值）
- **新**：`{beadData?.width || template.grid_width} × {beadData?.height || template.grid_height}`
- 优先使用从 `bead_data` 解析出的实际尺寸

### 2. 我的方案列表（云端）— `ProfilePage.tsx`
- **旧**：`{gridSize}×{gridSize}`（宽度值用了两遍）
- **新**：`{gridSize}×{gridHeight || gridSize}`
- 兼容旧数据：没有 `gridHeight` 时回退到 `gridSize`

### 3. 保存时补充实际高度
- **修改文件**：`EditorPage.tsx`、`localStorageService.ts`、`projectApi.ts`
- `settings` 新增可选字段 `gridHeight?: number`
- 保存到云端和本地时均写入 `gridHeight: beadData.height`
- 新数据正确显示，旧数据自动回退

## 修改文件清单
| 文件 | 改动 |
|------|------|
| `TemplateDetailPage.tsx` | 尺寸显示用 beadData 实际值 |
| `ProfilePage.tsx` | 云端方案用 gridHeight |
| `EditorPage.tsx` | 保存时写入 gridHeight |
| `localStorageService.ts` | settings 接口加 gridHeight |
| `projectApi.ts` | 两处 settings 接口加 gridHeight |

## 验证
- `npm run build` 编译通过
- 本地方案列表已用 `beadData.width × beadData.height`（之前已正确）
- 新保存的方案会正确存储 gridHeight
