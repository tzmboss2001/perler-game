# AI 抠图后端占位接口

## 时间
- 2026-03-11

## 本次改动
- 新增后端接口：`POST /api/v1/ai/cutout`
- 新增路由注册：
  - `server/router/ai.go`
  - `server/initialize/router.go`
- 新增接口实现：
  - `server/api/v1/ai/cutout.go`

## 当前行为
- 服务端默认读取环境变量 `AI_CUTOUT_MODE`
- 当前支持：
  - `off`：关闭接口能力
  - `mock`：服务端执行边缘背景透明化 mock 抠图
- 未设置时默认走 `mock`

## 返回协议
- 请求：
  - `imageData`
  - `mode`
- 返回：
  - `imageData`
  - `provider`

## 目的
- 固定前后端 `ai/cutout` 协议
- 让前端后续从 `mock` 切 `live` 时，不需要再重改请求结构

## 后续待做
- 把 `mock` 处理替换成真实供应商调用
- 增加图片 hash 缓存
- 增加广告解锁与配额控制
