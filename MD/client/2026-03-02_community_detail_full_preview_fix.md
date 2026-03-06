# 2026-03-02 社区详情图显示正常版修复

## 问题
- 社区详情页主图优先显示 `thumbnail_url`，导致用户进入详情后看到的是压缩缩略图效果，不是作品正常显示效果。

## 修复
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- 调整图片展示优先级：
  - 优先使用 `bead_data` 实时生成的 `fallbackPreviewUrl`（正常版像素预览）
  - 仅当 `fallbackPreviewUrl` 不可用时，才回退使用 `thumbnail_url`
- 保留原有占位图兜底。

## 影响
- 社区列表仍可用缩略图提升加载速度。
- 社区详情页打开后可看到接近作品原貌的正常预览，不再被缩略图画质限制。

## 验证
- `npm run build` 通过。
- `npm run dev` 已启动，`http://localhost:3005` 返回 `200`。

## 备注
- 执行规范更新：后续不再使用全局 `taskkill /F /IM node.exe`，避免误杀用户正在使用的 Node 进程。
