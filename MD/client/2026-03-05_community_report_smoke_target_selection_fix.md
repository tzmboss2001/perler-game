# 2026-03-05 举报烟测脚本目标选择修复

## 问题
- `TEST/community_report_smoke.ps1` 依赖手工传 `-PostId`，默认容易选到“自己发布的帖子”，导致举报必然失败（`cannot report your own post`）。
- 无可举报目标时脚本会直接中断，不利于 CI/回归记录。

## 修复
- 文件：`TEST/community_report_smoke.ps1`
- 新增能力：
  - 自动读取当前用户ID（`/api/v1/auth/user-info`）。
  - 未传 `-PostId` 时自动从社区列表挑选“非本人作品”。
  - 若当前环境没有可举报目标，不再抛错退出，而是写入可读报告步骤 `pick_report_target`。
- 统一改为 ASCII 文案，避免脚本编码导致的字符串异常。

## 验证
- 运行：
  - `powershell -ExecutionPolicy Bypass -File TEST/community_report_smoke.ps1 -BaseUrl http://localhost:8012 -Token <token> -FetchModerationReports`
- 结果：生成 `TEMP/community_report_smoke_report.json`，在“全是本人帖子”的环境下给出明确说明，不再中断。
