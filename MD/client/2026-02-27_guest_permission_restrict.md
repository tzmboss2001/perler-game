# 游客权限限制：制作/分享功能需登录

**日期**: 2026-02-27
**类型**: 功能增强
**影响文件**: 4个

## 修改内容

### 需求
游客（未登录用户）只能浏览社区和生成像素图，涉及制作、分享、保存方案都必须登录。未登录时应引导用户去登录。

### 修改点

#### 1. EditorPage.tsx — "开始制作"按钮 + "分享图纸"按钮
- `handleStartMakingClick()` 开头加 `isLoggedIn` 检查，未登录弹 showConfirm 引导登录
- 分享按钮 onClick 加 `isLoggedIn` 检查，未登录弹 showConfirm 引导登录
- 新增 `Modal` + `useModal` 导入

#### 2. MakingPage.tsx — 页面级访问保护
- 新增 `useUserStore` 导入
- 添加 `useEffect` 检查 `isLoggedIn`，未登录重定向到登录页
- 使用 `replace: true` 避免浏览器回退到此页

#### 3. CommunityDetailPage.tsx — "一键制作"按钮
- `handleStartMaking()` 开头加 `getToken()` 检查
- 未登录弹 showConfirm 引导登录
- 新增 `Modal` + `useModal` 导入

#### 4. ProfilePage.tsx — 云端方案分享
- `handleShare()` 将原来的 `if (!isLoggedIn) return;` 改为 showConfirm 弹窗引导登录
- 与 `handleShareLocal` 保持一致的用户体验

### 统一的登录引导模式
```typescript
showConfirm('登录后才能使用此功能', {
  title: '请先登录',
  type: 'info',
  confirmText: '去登录',
  onConfirm: () => navigate('/mobile/login', { state: { from: 当前路由 } }),
});
```

### 验证
- `npm run build` 编译通过
