# 2026-03-11 AI 抠图后端路由与缓存验证

## 本次目标
- 为本地 AI 抠图补齐可访问的后端接口。
- 增加结果缓存，避免同一张图重复计算。

## 本次修改
- 新增后端接口：`POST /api/v1/ai/cutout`
- 提供统一请求体：
  - `imageData`
  - `mode`
- 提供统一返回体：
  - `imageData`
  - `provider`
- 使用 `sync.Map` 做进程内缓存。
- 响应头增加 `X-AI-Cutout-Cache`，用于区分 `MISS / HIT`。

## 关键文件
- `perler-beads-server/server/api/v1/ai/cutout.go`
- `perler-beads-server/server/router/ai.go`
- `perler-beads-server/server/initialize/router.go`

## 本地验证
- 重新构建并启动本地后端后，日志已出现：
  - `POST /api/v1/ai/cutout --> perler-beads-server/api/v1/ai.(*AiApi).Cutout-fm`
- MCP 首次调用返回：
  - `Status=200`
  - `X-AI-Cutout-Cache=MISS`
- 复用同一份请求体重放后返回：
  - `Status=200`
  - `X-AI-Cutout-Cache=HIT`

## 结论
- 本地 AI 抠图后端路由已接通。
- 同图重复请求已能命中缓存。
- 当前仍是本地 mock 处理逻辑，不是外部真实 AI 供应商。
