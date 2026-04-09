# 2026-03-30 最大宽度云端保存 bead_data 紧凑化

## 问题
- 即使加入传输压缩，最大宽度保存时 `bead_data` 原始结构仍然过大。
- 原始保存结构为每格一整套颜色对象，包含 id、name、nameCN、rgb、hex、brand，导致 JSON 展开体积过大。

## 修改
- 在 `src/services/api/projectApi.ts` 中新增云端保存专用紧凑结构：
  - `encoding: bead-id-grid-v1`
  - `width`
  - `height`
  - `beads: [colorId | null, ...]`
- 云端保存时先把 bead_data 压成颜色 ID 网格，再执行 gzip + base64 传输压缩。
- 读取云端方案详情时，如果发现是 `bead-id-grid-v1`，会自动还原成完整珠色对象，保持页面其他逻辑不变。

## 结果
- 最大宽度时 `project/create` 请求体进一步缩小。
- 既减轻前端传输负担，也不影响后续读取云端方案时的使用体验。
