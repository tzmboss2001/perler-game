# 前端发布脚本进程环境变量密码入口

## 问题

在当前自动化环境里，`getpass` 交互窗口无法稳定回到调用进程，发布脚本会卡在 SSH 密码输入阶段，正式域名无法完成更新。

## 修改

- `SCRIPT/deploy_frontend_ssh.py`
  - 新增 `DEPLOY_FRONTEND_SSH_PASSWORD` 当前进程环境变量入口。
  - 优先读取当前进程环境变量，读不到时继续使用 `getpass.getpass()` 手动输入。
  - 不新增命令行密码参数。

- `TEST/deploy_frontend_ssh_security.test.mjs`
  - 增加安全契约测试，确认脚本支持进程环境变量入口，同时不恢复 `--password` 命令行参数。

## 安全约束

- 密码不写入代码。
- 密码不写入配置文件。
- 密码不写入 MD。
- 密码不作为命令行参数传递。
- 发布日志不打印密码。

## 验证

- `cmd /c node --test TEST\deploy_frontend_ssh_security.test.mjs`

## 回滚

未提交前：

```powershell
git restore SCRIPT/deploy_frontend_ssh.py TEST/deploy_frontend_ssh_security.test.mjs
Remove-Item MD\server\2026-05-21_deploy_frontend_process_env_password.md
```

已提交后：

```powershell
git revert <commit-id>
```
