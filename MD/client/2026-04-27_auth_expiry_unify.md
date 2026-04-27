## 时间
- 2026-04-27

## 目标
- 统一前端对登录过期的识别和退出登录处理
- 避免出现“页面还显示已登录，但 token 已失效”的不一致状态

## 本次改动
- 新增统一工具：
  - `perler-beads/src/services/api/authExpiry.ts`
  - 统一识别 `401 / code:7 / 未登录或鉴权失败文案`
- 更新 `authApi.clearToken()`
  - 清本地 token 后广播 `perler-auth-cleared`
- 更新 `App.tsx`
  - 全局监听 `perler-auth-cleared`
  - 收到后重新执行 `initUser()`
- 更新 `userStore.initUser()`
  - 无 token 或无用户信息时，显式回到未登录状态
- 在这些 API request helper 里统一接入鉴权失效识别：
  - `authApi.ts`
  - `projectApi.ts`
  - `communityApi.ts`
  - `finishedWorkApi.ts`
  - `templateApi.ts`
  - `userApi.ts`
  - `uploadApi.ts`
- 社区详情页和成品详情页复用统一 helper，删除页面内重复判断

## 测试
- 新增：
  - `TEST/auth_expiry_unify.test.mjs`
- 覆盖点：
  - `401 / 7 / 未登录文案` 识别
  - `clearToken()` 清理并广播事件
  - `handleAuthExpiredApiResponse()` 只对鉴权失效触发
  - `userStore.initUser()` 在有 token 时恢复登录、无 token 时回到未登录

## 验证
- `cmd /c node --test TEST\\auth_expiry_unify.test.mjs`
  - 4/4 通过
- `cmd /c npm.cmd run build`
  - 通过
- MCP
  - 本地 `http://127.0.0.1:3007/mobile/profile` 页面正常打开
  - 未出现新的控制台错误

## 说明
- 本轮不改后端鉴权返回口径
- 本轮不引入 token 刷新机制，只统一“识别失效并正确退出登录”
