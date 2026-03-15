# 2026-03-14 反馈页表单字段属性补全

## 问题
- 本地 MCP 回归时，反馈页控制台出现可访问性警告：表单字段缺少 `id` 或 `name` 属性。
- 影响浏览器辅助能力和表单语义完整性。

## 处理
- 为反馈内容输入框补充：
  - `id="feedback-content"`
  - `name="feedback-content"`
- 为联系方式输入框补充：
  - `id="feedback-contact"`
  - `name="feedback-contact"`

## 影响范围
- 客户端
- 文件：`perler-beads/src/pages/mobile/FeedbackPage.tsx`

## 验证
- 运行 `npm run build`，前端构建通过。
- 使用 MCP 重新打开反馈页并检查控制台，确认该表单警告消失。
