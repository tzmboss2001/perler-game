# 登录过期统一收口 Design

## 背景
- 当前前端对登录过期的处理是分散的：
  - `authApi` 只会对业务 `code === 401` 清 token
  - 社区详情、成品详情、编辑页各自又补了 `code:7 / 未登录文案` 的判断
  - `communityApi / projectApi / templateApi / userApi / uploadApi / finishedWorkApi` 没有统一识别逻辑
- 结果是同一个“登录已失效”状态，在不同页面会表现成：
  - 有的页面能跳登录
  - 有的页面只报错
  - 有的页面前端仍显示“已登录”，但接口已经失效

## 目标
- 统一识别所有常见登录失效信号：
  - HTTP `401`
  - 业务 `code:7`
  - 常见未登录/鉴权失败文案
- 一旦识别到登录失效：
  - 统一清理本地 token
  - 统一广播前端登录状态变更
  - 页面只决定“直接跳登录”还是“保留现场后跳登录”

## 方案

### 1. 新增统一鉴权失效工具
- 新建 `perler-beads/src/services/api/authExpiry.ts`
- 职责：
  - `isAuthExpiredApiResponse(response)`
  - `isAuthExpiredMessage(message)`
  - `handleAuthExpiredApiResponse(response)`：识别到失效时调用 `clearToken()`

### 2. API 层统一接入
- 在这些 request helper 里统一接入 `handleAuthExpiredApiResponse(...)`
  - `authApi.ts`
  - `projectApi.ts`
  - `communityApi.ts`
  - `finishedWorkApi.ts`
  - `templateApi.ts`
  - `userApi.ts`
  - `uploadApi.ts`
- 保持现有返回结构，不把所有调用方强行改成 `throw`
- 这样能最小化回归风险

### 3. 全局同步前端登录态
- `clearToken()` 不只清 `localStorage`
- 还要触发浏览器事件，例如 `perler-auth-cleared`
- `App.tsx` 监听这个事件并调用 `initUser()`
- `userStore.initUser()` 调整为：
  - 有 token + userInfo => 进入已登录
  - 否则显式回到未登录
- 这样当任意 API 层识别到 token 失效时，UI 会自动同步成未登录

### 4. 保留页面级差异化体验
- 编辑页继续保留“先保留现场，再去登录”的流程
- 社区详情 / 成品详情继续保留“弹提示后跳登录”的体验
- 但底层识别逻辑不再各写一份

## 验证
- 单测：
  - 识别 `401 / 7 / 未登录文案`
  - 非鉴权错误不误判
  - `initUser()` 在 token 被清后回到未登录
- 构建：
  - `npm run build`
- MCP：
  - 本地 profile 页先伪造已登录状态
  - 手动触发 `perler-auth-cleared`
  - 确认 UI 从已登录切回未登录

## 范围外
- 不改后端鉴权口径
- 不把所有页面都重写成统一弹窗组件
- 不处理 token 刷新机制，本轮只做“识别失效并正确退出登录”
