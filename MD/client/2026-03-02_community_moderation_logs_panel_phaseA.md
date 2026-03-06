# 社区审核台操作历史面板

日期：2026-03-02

## 改动
1. 社区 API 前端新增：
   - `getModerationLogs`
   - `CommunityReviewLogItem`
   - 文件：`src/services/api/communityApi.ts`
2. 审核台页面新增“操作历史”区块：
   - 支持按作品ID筛选
   - 支持日志分页
   - 展示动作、状态流转、审核人、时间、原因
   - 文件：`src/pages/mobile/CommunityModerationPage.tsx`

## 同步修复
- 修复审核台页面 JSX 文本箭头语法问题（`->` 改为 `→`）。

## 验证
- `cmd /c npm run build` 通过。
