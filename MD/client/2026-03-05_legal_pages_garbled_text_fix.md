# 2026-03-05 法务页面乱码修复（隐私政策/用户协议）

## 问题
- 抖音上线合规检查阶段发现：
  - `PrivacyPolicyPage.tsx`
  - `UserAgreementPage.tsx`
  存在明显中文乱码，影响审核观感与合规表达准确性。

## 修复内容
1. 全量重写隐私政策页面文案与结构
- 文件：`perler-beads/src/pages/mobile/PrivacyPolicyPage.tsx`
- 结果：标题、章节、条目、联系信息全部恢复为可读中文。

2. 全量重写用户协议页面文案与结构
- 文件：`perler-beads/src/pages/mobile/UserAgreementPage.tsx`
- 结果：协议范围、账号安全、服务内容、行为规范、责任限制等条款恢复为可读中文。

3. 保持原页面交互与样式框架
- 仍保留返回按钮、固定头部、分段卡片样式，确保功能与视觉一致。

## 验证
- 前端构建：`cmd /c npm run build` 通过。
- 合规脚本：`powershell -ExecutionPolicy Bypass -File SCRIPT/douyin_compliance_check.ps1 -Root .` 通过。
- 乱码关键字扫描（两页）：未发现异常字符。

## 影响
- 提升提审材料可信度与用户可读性。
- 降低因文案乱码导致的审核驳回风险。
