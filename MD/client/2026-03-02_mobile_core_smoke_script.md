# 2026-03-02 上线完善：移动端主链路冒烟测试脚本

## 本次目标
- 继续完善上线准备能力，降低“改完后回归靠手点”的风险。

## 完成内容
1. 新增测试脚本：`TEST/mobile_core_smoke.ps1`
- 覆盖核心接口链路：
  - `/health`
  - `/api/v1/auth/login`
  - `/api/v1/community/posts`
  - `/api/v1/community/posts/{id}`
  - `/api/v1/community/posts/{id}/make`

2. 执行并产出报告：`TEMP/mobile_core_smoke_report.md`
- 本次结果：全部 PASS。

3. 保持前端构建通过
- 执行 `npm run build`，通过。

## 说明
- 本轮曾尝试直接改合规页面占位配置，但受历史混合编码影响，改动会破坏页面语法。
- 已回退该尝试，避免影响当前可发布状态。
- 下一步建议：先统一这些页面的文件编码为 UTF-8，再做占位信息统一治理。
