# 2026-03-05 第二轮乱码清理（About / Settings / LegalInfo）

## 背景
- 提审前第二轮可见文案清理。
- 重点修复用户高频访问页面中的中文乱码：关于页、设置页、法务基础信息配置。

## 修改内容

### 1) 修复法务基础信息配置
- 文件：`perler-beads/src/config/legalInfo.ts`
- 修复项：
  - 应用名、开发者名称恢复正常中文。
  - 生效日期与更新日期恢复规范日期格式。

### 2) 重写关于页（保持功能，修正文案）
- 文件：`perler-beads/src/pages/mobile/AboutPage.tsx`
- 修复项：
  - 标题、法律入口、开发者信息、版权文案恢复正常中文。
  - 保留原跳转逻辑（隐私政策/用户协议）。

### 3) 重写设置页（保持功能，修正文案）
- 文件：`perler-beads/src/pages/mobile/SettingsPage.tsx`
- 修复项：
  - 帮助反馈、数据管理、账号注销、法律入口、版本信息全部恢复可读中文。
  - 保留原交互能力：清缓存、反馈跳转、注销账号二次确认、法务页面跳转。
  - 修复 JSX 文本符号导致的构建报错（`>` 改为 `{'>'}`）。

## 验证
- 前端构建：`cmd /c npm run build` 通过。
- 合规脚本：`powershell -ExecutionPolicy Bypass -File SCRIPT/douyin_compliance_check.ps1 -Root .` 通过。
- 乱码扫描（本次修改的 3 个文件）：未命中异常字符。

## 结果
- 本轮涉及页面的用户可见中文已恢复正常。
- 提审可读性与法务表达稳定性进一步提升。
