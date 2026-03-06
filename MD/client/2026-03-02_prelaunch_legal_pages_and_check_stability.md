# 2026-03-02 上线推进：合规页重构与巡检稳定性修复

## 本轮完成
1. 合规页面重构为 UTF-8 正常版本
- `src/pages/mobile/AboutPage.tsx`
- `src/pages/mobile/PrivacyPolicyPage.tsx`
- `src/pages/mobile/UserAgreementPage.tsx`

2. 新增统一合规信息配置
- `src/config/legalInfo.ts`
- 3 个页面统一读取该配置，避免散落占位信息。

3. 修复巡检脚本误判
- 文件：`SCRIPT/prelaunch_check.ps1`
- 调整前端构建检查为“按退出码判定”，并将构建日志写入 `TEMP/prelaunch_front_build.log`，避免被构建告警误判为 FAIL。

4. 验证结果
- 前端构建：PASS
- 后端构建：PASS
- 核心冒烟：PASS（health/login/community list/detail/make）
- 占位信息检查：0

## 产物
- 巡检报告：`TEMP/prelaunch_report.md`
- 冒烟报告：`TEMP/mobile_core_smoke_report.md`
