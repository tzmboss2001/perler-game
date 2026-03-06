# 2026-03-06 成品先审后发与运营端成品审核面板

## 本次目标
- 将“成品作品”从“发布即公开”改为“先审核后公开”。
- 让运营后台可直接审核成品（通过/驳回/下架/恢复）。

## 客户端改动
### 1) 成品 API 扩展
- 文件: `perler-beads/src/services/api/finishedWorkApi.ts`
- 新增字段:
  - `FinishedWorkItem.status`
  - `FinishedWorkItem.review_status`
  - `FinishedWorkItem.review_reason`
- 新增接口:
  - `getModerationWorks`
  - `reviewWork`

### 2) 运营后台新增“成品审核”页签
- 文件: `perler-beads/src/pages/admin/AdminConsolePage.tsx`
- 新增页签: `finishedWorks`
- 新增筛选: 全部/待审/通过/驳回/下架
- 新增操作: 通过、驳回、下架、恢复
- 新增分页与状态展示

## 验证
- `npm run build` 通过。

## 用户可见变化
- 成品提交后不再自动进入公开流（默认待审）。
- 运营可在后台单独审核成品内容并控制上/下架状态。
