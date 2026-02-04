# 添加账号注销和意见反馈功能

## 日期
2026-02-02

## 需求背景
抖音小程序上线审核要求：
1. **账号注销**（工信部强制要求）- 用户必须能删除自己的账号
2. **意见反馈** - 提供用户反馈渠道

## 修改内容

### 1. 账号注销功能

**API层** (`src/services/api/authApi.ts`)
- 新增 `deleteAccount` 方法，调用 `/api/v1/auth/delete-account` 接口

**状态管理** (`src/store/userStore.ts`)
- 新增 `deleteAccount` action
- 注销成功后清除所有本地数据（包括制作进度缓存）

**设置页面** (`src/pages/mobile/SettingsPage.tsx`)
- 新增"账号管理"区块（仅登录用户显示）
- 显示当前账号信息
- 注销按钮带双重确认：
  1. 第一次确认：弹窗告知将删除的内容
  2. 第二次确认：输入"确认注销"文字

**确认提示内容**：
```
⚠️ 确定要注销账号吗？

注销后将永久删除：
• 您的账号信息
• 所有已保存的方案
• 所有制作进度
• 会员权益（如有）

此操作不可恢复！
```

### 2. 意见反馈功能

**新建反馈页面** (`src/pages/mobile/FeedbackPage.tsx`)

**功能特点**：
- 三种反馈类型：问题反馈、功能建议、其他反馈
- 反馈内容输入框（10-500字）
- 联系方式输入（选填，已登录用户自动填充邮箱）
- 提交成功后显示感谢页面

**路由配置** (`src/router/index.tsx`)
- 新增 `/mobile/feedback` 路由

**导航映射** (`src/components/BottomNav.tsx`)
- 反馈页面归属"我的"模块

### 3. 设置页面优化

- 新增"帮助与反馈"区块，放置意见反馈入口
- 调整区块顺序：帮助与反馈 → 数据管理 → 账号管理 → 法律信息

## 涉及文件
- `src/services/api/authApi.ts` - 新增注销API
- `src/store/userStore.ts` - 新增注销action
- `src/pages/mobile/SettingsPage.tsx` - 重构设置页面
- `src/pages/mobile/FeedbackPage.tsx` - 新建反馈页面
- `src/router/index.tsx` - 新增路由
- `src/components/BottomNav.tsx` - 更新路径映射

## 后端API需求
需要后端实现 `DELETE /api/v1/auth/delete-account` 接口：
- 删除用户账号信息
- 删除用户所有方案数据
- 删除用户所有关联数据

## 审核要点
- ✅ 账号注销入口清晰可见
- ✅ 注销前有明确的提示说明
- ✅ 注销需要用户二次确认
- ✅ 提供意见反馈渠道
