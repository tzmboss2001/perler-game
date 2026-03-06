# 2026-03-02 社区详情页颜色映射修复

## 问题
- 社区详情页中，部分作品（如 `colorId=C01/C51`）进入详情后无法正确显示，出现大面积缺色或空白。
- 原因是详情页仅使用 `colorId -> allBeadColors` 映射，映射失败就直接跳过像素。

## 修复
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- 详情预览与制作数据转换增加兜底逻辑：
  - 优先使用 `bead.hex`（若存在）
  - 其次使用色表映射 `colorId`
  - 都不可用时，按 `colorId` 生成稳定哈希颜色
- `convertToBeadPixelData` 不再因未知 `colorId` 丢失珠子，改为构造可用的临时颜色对象。

## 结果
- 社区详情页对“未知色号”的作品可稳定显示完整图案，不再出现大片缺失。
- “一键开始制作”带入的数据完整性提升，不会因为未知色号掉点。

## 验证
- `npm run build` 通过。
