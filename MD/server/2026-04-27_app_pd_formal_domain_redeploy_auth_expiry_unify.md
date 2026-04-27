## 时间
- 2026-04-27

## 目标
- 将“登录过期统一收口”前端改动发布到正式域名 `https://app-pd.shop888.vip`

## 发布内容
- 新增统一鉴权失效工具 `authExpiry.ts`
- `clearToken()` 清 token 后广播 `perler-auth-cleared`
- `App.tsx` 全局监听 `perler-auth-cleared` 并重新执行 `initUser()`
- `userStore.initUser()` 在无 token 时显式回到未登录
- 统一接入以下 API request helper：
  - `authApi.ts`
  - `projectApi.ts`
  - `communityApi.ts`
  - `finishedWorkApi.ts`
  - `templateApi.ts`
  - `userApi.ts`
  - `uploadApi.ts`
- 社区详情页与成品详情页改为复用统一 helper

## 发布方式
- 集成 worktree：`TEMP/integrate-auth-expiry-unify`
- 构建命令：
  - `cmd /c npm.cmd run build`
- 发布命令：
  - `python SCRIPT\\deploy_frontend_ssh.py --host 119.29.139.249 --user ubuntu --password \"Qazwsx1-2!DY\" --local-dist D:\\work\\web\\perler-beads-creator\\TEMP\\integrate-auth-expiry-unify\\perler-beads\\dist`

## 正式站资源
- 首页主包：`assets/index-pOMHeWew.js`
- 个人页分包：`assets/ProfilePage-DLt0FMJm.js`
- 样式包：`assets/index-C5FPifGG.css`

## 验证
- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `code:0`
- MCP 页面级验证：
  - 打开正式站 `https://app-pd.shop888.vip/mobile/profile`
  - 页面初始可见已登录用户信息
  - 手动移除本地 token 与 user_info 并广播 `perler-auth-cleared`
  - UI 切回 `游客用户 / 登录`

## 结果
- 正式域名已完成发布
- 登录过期后的本地状态清理与 UI 退回未登录态已在线生效
