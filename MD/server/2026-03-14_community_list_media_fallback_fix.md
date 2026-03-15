# 2026-03-14 社区列表卡片图地址回退修复

## 问题
- 本地 MCP 回归时，首页社区卡片出现多条图片 404。
- 根因不是单纯前端，而是列表接口会直接返回缺失的 `thumbnail_url`，导致列表卡片拿到一个本地并不存在的地址。

## 修改
- 在社区服务列表返回阶段增加卡片图地址回退：
  - `thumbnail_url` 优先取真实存在的缩略图，缺失时回退到 `preview_url`
  - `preview_url` 优先取真实存在的详情图，缺失时回退到 `thumbnail_url`
- 这样前端列表页拿到的就是可用地址，不再因为本地缺图产生整批 404。

## 涉及文件
- `perler-beads-server/server/service/community.go`

## 验证
- `go build -o perler-beads-server.exe` 通过
- 重启本地 `8012` 后端后，MCP 复查首页控制台，不再出现社区卡片图片 404
