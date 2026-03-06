# 2026-03-02 制作进度与我的色板前端云同步

## 目标
- 登录用户自动将制作进度同步到云端。
- 我的色板支持打开时从云端拉取、保存时同步到云端。

## 客户端改动
1. 新增用户偏好 API
- 文件：`src/services/api/userApi.ts`
- 方法：`getPreferences`、`updatePreferences`

2. myColorsService 增强
- 文件：`src/services/myColorsService.ts`
- 新增：`syncFromCloud`、`syncToCloud`
- 保留本地存储作为离线兜底

3. 登录态自动拉取色板
- 文件：`src/store/userStore.ts`
- 在 `initUser/login/smartLogin` 成功后触发 `myColorsService.syncFromCloud`

4. MyColorsModal 同步策略
- 文件：`src/components/MyColorsModal.tsx`
- 打开弹窗时优先拉云端数据
- 点击保存时：本地保存 + 云端同步

5. MakingPage 进度云同步
- 文件：`src/pages/mobile/MakingPage.tsx`
- 新增 `saveSelectionStateToCloud`
- 在 `pagehide/visibilitychange` 时触发云同步
- 新增 600ms 防抖同步，减少请求频率
- 条件：仅 `isLoggedIn && projectId` 时启用

## 验证
- `npm.cmd run build` 通过。
- 进度接口联调通过：`project/:id/progress` 更新后详情可读到 `selectionType/blockX`。
- 偏好接口联调通过：`A1,B2,H8` 可写可读。
