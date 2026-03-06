# 2026-03-03 社区举报交互优化（客户端）

## 本次改动
1. 举报提交流程从浏览器 `prompt` 升级为统一弹窗
- 文件：`perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- 使用 `useModal` 的 `showPrompt` + `showAlert/showError` 完成两步输入：
  - 第一步：举报原因（必填）
  - 第二步：补充说明（可选）
- 提交态保留 `reporting`，防重复点击。

2. 新增举报冒烟脚本
- 文件：`TEST/community_report_smoke.ps1`
- 功能：
  - 提交举报
  - 可选拉取待处理举报列表
  - 生成 `TEMP/community_report_smoke_report.json`

## 验证
- `npm run build`（`perler-beads`）通过

## 价值
- 移动端体验更稳定，避免系统弹窗在不同浏览器上的行为差异。
