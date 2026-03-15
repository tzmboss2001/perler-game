# 2026-03-14 社区缩略图 404 修复

## 问题
- 本地开发环境下，社区详情页和作者主页里请求 `/thumbnails/*.png` 时出现 404。
- 根因不是缩略图未生成，而是 Vite 将 `/thumbnails` 代理到了本地后端，绕开了前端 `public/thumbnails` 中已经存在的静态文件。

## 修复
- 移除 `perler-beads/vite.config.ts` 中开发环境与 preview 环境对 `/thumbnails` 的代理配置。
- 让 Vite 直接从前端 `public/thumbnails` 提供缩略图静态资源。

## 影响
- 本地开发和本地预览环境下，社区缩略图不再因为代理落到后端而返回 404。
- 生产环境不受影响，仍由部署环境的静态资源链路处理。

## 验证
- `npm run build` 通过。
- MCP 复测社区详情页和作者主页，确认 `/thumbnails/*.png` 返回 200。
