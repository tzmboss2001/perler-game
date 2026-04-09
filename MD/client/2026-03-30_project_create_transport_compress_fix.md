# 2026-03-30 最大宽度保存请求体压缩修复

## 问题
- 编辑图案页把宽度拉到最大值后，点击“保存并开始制作”会长时间停在保存中。
- 实测发现两次图片上传都成功，但 `POST /api/v1/project/create` 一直 pending，最终中断。
- 根因是前端把完整 `bead_data` 原样 JSON 提交，最大宽度时请求体过大，导致方案创建链路极慢甚至失败。

## 修改
- 在 `src/services/api/projectApi.ts` 中新增 `bead_data` 传输前 gzip + base64 压缩。
- 压缩格式与服务端已有 `gzip-base64-json` 保持一致。
- 若浏览器不支持 `CompressionStream` 或压缩失败，自动回退到原始 JSON 提交。

## 结果
- 最大宽度保存时，`project/create` 的请求体大幅缩小。
- 后续由服务端直接识别已压缩的 `bead_data`，避免前端超大 JSON 请求阻塞创建方案。
