# 2026-03-02 社区详情缺图兜底修复记录

## 问题现象
- 社区作品存在缩略图缺失时，详情页只能看到占位图，无法看到作品具体内容。

## 修复内容
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- 新增逻辑：
  - 增加 `imageLoadError` 状态，监听主图 `onError`。
  - 增加 `fallbackPreviewUrl`，根据 `bead_data` 动态渲染 base64 预览图。
  - 当 `thumbnail_url` 缺失或加载失败时，自动展示 `bead_data` 生成的预览图。

## 验证
- `npm.cmd run build` 构建通过。

## 结果
- 历史缺缩略图作品在详情页也可看到具体图案，不再只能显示占位符。
