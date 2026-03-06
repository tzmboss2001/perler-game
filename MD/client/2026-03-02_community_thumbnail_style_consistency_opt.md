# 2026-03-02 社区缩略图渲染风格一致性优化

## 诉求
- 社区缩略图可以降采样，但不能改变原作品显示风格和样式。

## 修改
- 文件：`perler-beads/src/services/thumbnailService.ts`
- 将 `generateThumbnailFromBeadData` 改为：
  1. 先按原 bead 数据逐像素绘制（每颗珠子=1像素）
  2. 再等比放大到缩略图尺寸
  3. 关闭 `imageSmoothing` 保持像素风格
- 移除暗色背景和圆珠重绘逻辑，避免样式偏差。

## 验证
- 执行 `npm.cmd run build`，构建通过。

## 结果
- 新发布到社区的预览图将保持原图案视觉风格，仅分辨率发生变化。
