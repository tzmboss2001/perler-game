# 2026-03-03 Chrome DevTools MCP 安装记录

## 目标
为 Codex 安装并启用 `chrome-devtools-mcp`，用于浏览器界面自动化调试。

## 操作内容
1. 检查环境：
- Node: `v22.15.0`
- npm: `10.9.2`（通过 `cmd /c npm -v`）

2. 验证 MCP 包可执行：
- `cmd /c npx -y chrome-devtools-mcp@latest --help`

3. 配置 `C:\Users\tzm\.codex\config.toml`：
```toml
[mcp_servers.chrome-devtools]
command = "cmd"
args = [
  "/c",
  "npx",
  "-y",
  "chrome-devtools-mcp@latest"
]
env = { SystemRoot="C:\\Windows", PROGRAMFILES="C:\\Program Files" }
startup_timeout_ms = 20000
```

4. 验证启用状态：
- `cmd /c codex mcp list`
- 结果：`chrome-devtools` 状态为 `enabled`

## 结论
`chrome-devtools-mcp` 已安装并配置完成，可在新的 Codex 会话中使用对应 MCP 工具进行浏览器界面测试。
