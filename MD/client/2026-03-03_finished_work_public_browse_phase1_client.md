# 2026-03-03 成品社区公开浏览（前端）

## 目标
- 给手机用户提供“成品社区”浏览链路：首页入口 -> 列表 -> 详情多图。

## 本次修改
1. 前端 API 扩展
- 文件：`perler-beads/src/services/api/finishedWorkApi.ts`
- 新增方法：
  - `listPublic(page, pageSize)`
  - `getPublicDetail(id)`
- `FinishedWorkItem` 增加 `user` 字段映射作者信息。

2. 新增页面
- `perler-beads/src/pages/mobile/FinishedWorksPage.tsx`
  - 公开成品瀑布/网格列表
  - 滚动分页加载
- `perler-beads/src/pages/mobile/FinishedWorkDetailPage.tsx`
  - 成品详情
  - 多图展示 + 作者 + 发布时间

3. 路由接入
- 文件：`perler-beads/src/router/index.tsx`
- 新增：
  - `/mobile/finished`
  - `/mobile/finished/:id`

4. 首页入口
- 文件：`perler-beads/src/pages/mobile/HomePage.tsx`
- 快捷操作改为 2x2，新增“成品社区”入口按钮。

## 验证
- `cmd /c npm run build`（目录：`perler-beads`）通过。

## 备注
- PowerShell 执行策略阻止 `npm.ps1`，已改用 `cmd /c npm run build` 规避。
