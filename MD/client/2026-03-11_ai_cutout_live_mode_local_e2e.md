# 2026-03-11 AI 抠图本地 live 链路打通

## 本次目标
- 不再停留在前端 mock。
- 让编辑页里的“智能抠图”真正请求本地后端 `/api/v1/ai/cutout`。
- 用 MCP 验证前端不是假成功。

## 本次修改
- 前端 AI 抠图服务改为可切换 `off / mock / live` 三种模式。
- 本地环境切到 `VITE_AI_CUTOUT_ENABLED=live`。
- 编辑页继续沿用已有的广告解锁、结果回灌、恢复原图链路。
- 保留前端本地内存缓存，减少同图重复请求。

## 关键文件
- `perler-beads/src/services/aiCutoutService.ts`
- `perler-beads/.env.local`
- `perler-beads/src/pages/mobile/EditorPage.tsx`

## MCP 验证结果
- 本地页面：`http://127.0.0.1:3005/mobile/create`
- 点击背景模式里的“智能抠图”后，实际发起请求到 `http://localhost:8012/api/v1/ai/cutout`
- 第一次请求返回 `200`，响应头 `X-AI-Cutout-Cache=MISS`
- 页面出现：
  - `智能抠图结果已应用`
  - `恢复抠图前原图`
- 说明结果已经真实回灌到编辑页，不是纯前端占位提示

## 说明
- 这轮只做本地联调，没有发布公网。
