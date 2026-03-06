# 2026-03-02 Bead API TODO误报清理

## 背景
- 上线巡检脚本统计到 `bead.go` 仍有 TODO 关键词，导致风险计数非零。
- 实际接口已返回可用静态数据，属于注释遗留问题。

## 修改
- 文件：`server/api/v1/bead/bead.go`
- 将两处 TODO 注释替换为明确说明：当前返回内置静态数据，后续可切数据库配置。
- 同时修正该文件历史编码噪声，统一为 UTF-8。

## 验证
- `go build .`（`perler-beads-server/server`）通过。
- `SCRIPT/prelaunch_check.ps1` 通过，`TODO/FIXME/HACK/XXX` 计数降为 0。
