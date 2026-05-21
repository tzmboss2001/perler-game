# 2026-05-19 deploy_frontend_ssh 交互式密码输入

## 背景

正式域名发布需要 SSH 登录服务器。为避免 SSH 密码进入 git、命令行历史、日志、MD 或 commit，本次调整部署脚本的密码输入方式。

## 修改内容

- `SCRIPT/deploy_frontend_ssh.py` 不再要求 `--password` 命令行参数。
- 脚本运行时通过 `getpass.getpass()` 提示手动输入 SSH 密码。
- sudo 执行不再把密码拼进远端 shell 命令字符串。
- sudo 密码通过非 PTY SSH stdin 输入，避免终端回显密码。

## 追加修正

首次交互式发布时，脚本使用 PTY 通道向 sudo 输入密码，终端会回显 stdin。已改为非 PTY 通道输入，避免后续发布窗口或日志出现密码内容。

## 验证

- `node --test TEST\deploy_frontend_ssh_security.test.mjs`
- `python -m py_compile SCRIPT\deploy_frontend_ssh.py`

## 回滚方式

- 回滚 `SCRIPT/deploy_frontend_ssh.py` 中的交互式密码逻辑。
- 删除 `TEST/deploy_frontend_ssh_security.test.mjs`。
