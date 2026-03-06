# 前端开发进程误杀修复记录

日期：2026-03-02

## 问题
- 使用了 `taskkill /F /IM node.exe`，会误杀用户正在运行的其他 Node 服务。

## 处理
1. 停止使用全局 `taskkill /IM node.exe`。
2. 改为记录并只处理当前会话启动的 PID。
3. 重新拉起前端开发服务，确认 `localhost:3005` 正常监听。

## 验证
- `netstat -ano | findstr LISTENING | findstr :3005`
- 结果：`0.0.0.0:3005 LISTENING 19448`

## 约束
- 后续如需停服务，只允许按 PID 精确结束，不做全局 Node 进程清理。
