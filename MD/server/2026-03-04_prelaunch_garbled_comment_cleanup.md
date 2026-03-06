# 2026-03-04_prelaunch_garbled_comment_cleanup

## 问题
- 预上线检查 `prelaunch_check.ps1` 报告后端存在 1 处乱码文本：
  - `server/service/community.go` 的 `ReviewPost` 注释出现 `?????`。

## 修复
- 文件：`perler-beads-server/server/service/community.go`
- 将注释从乱码文本改为清晰英文说明：
  - `// ReviewPost handles moderator actions: approve/reject/hide/restore.`

## 影响
- 不影响运行逻辑，仅修复可读性与上线质量检查噪音。

## 验证
- 重新执行 `SCRIPT/prelaunch_check.ps1`，确认 `Possible garbled text` 计数归零。
