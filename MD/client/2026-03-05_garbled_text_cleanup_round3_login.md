# 2026-03-05 第三轮乱码清理（Login 页面）

## 修复目标
- 清理登录页用户可见乱码，确保提审观感和核心登录链路文案正常。

## 修改内容
1. 重写登录页
- 文件：`perler-beads/src/pages/mobile/LoginPage.tsx`
- 修复点：
  - 页面标题/引导语/占位符/按钮/错误提示/成功提示/页脚文案全部恢复正常中文。
  - 保留原有业务流程：
    - 智能登录（新邮箱自动注册）
    - 登录后回跳来源页面
    - 游客继续使用

2. 保持交互逻辑不变
- 仍使用 `useUserStore.smartLogin`
- 保留 `from` 回跳逻辑
- 保留密码显示切换、表单校验与状态提示

## 验证
- 前端构建：`cmd /c npm run build` 通过
- 合规脚本：`SCRIPT/douyin_compliance_check.ps1` 通过
- 核心页面乱码扫描（Login/About/Settings/Legal/Privacy/UserAgreement）：未命中

## 备注
- 当前代码库仍有少量乱码主要存在于注释和日志文案（如 Making/Community/Profile 内部注释），不直接影响用户界面。
- 下一轮可做“非可见文本清理专项”，提升代码可维护性。
