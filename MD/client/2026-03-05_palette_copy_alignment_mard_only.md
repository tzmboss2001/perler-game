# 2026-03-05 色系文案对齐修复（欢迎页/帮助页）

## 问题
- 用户反馈欢迎页仍显示“Perler/Hama/Artkal”，与当前实际生成色系（MARD）不一致。

## 修复
- 文件：`perler-beads/src/components/OnboardingModal.tsx`
  - 引导第3屏改为：`MARD 珠子色板`
  - 描述改为：`当前支持 MARD 色系\n自动匹配最接近的珠子颜色`
  - 同步修复该文件中历史乱码导致的“下一步/立即开始”按钮表达式断裂。
- 文件：`perler-beads/src/pages/mobile/HelpPage.tsx`
  - 教程步骤文案改为当前事实：使用 MARD 色系。
  - FAQ 首条改为：`当前支持哪个拼豆色系？`
  - FAQ 答案改为：`当前默认使用 MARD 色系（291色）`。

## 验证
- `npm.cmd run build` 通过。
- Onboarding/Help 两个页面不再出现 Perler/Hama/Artkal 的误导性文案。
