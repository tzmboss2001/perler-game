# 添加底部导航栏到设置、帮助、关于页面

## 日期
2026-02-02

## 需求
给设置、帮助、关于页面添加底部导航栏，保持全应用导航一致性。

## 修改内容

### 1. SettingsPage.tsx
- 引入 BottomNav 组件
- 添加 `<BottomNav />` 到页面底部
- 调整 container paddingBottom 为 80px

### 2. HelpPage.tsx
- 引入 BottomNav 组件
- 添加 `<BottomNav />` 到页面底部
- 调整 container paddingBottom 为 80px

### 3. AboutPage.tsx
- 引入 BottomNav 组件
- 添加 `<BottomNav />` 到页面底部
- 调整 container paddingBottom 为 80px

## 效果
- 用户在设置、帮助、关于页面也能看到底部导航栏
- 导航栏"我的"图标高亮显示（因为这些页面都属于"我的"模块）
- 用户可以直接从这些页面跳转到首页或创作页面

## 涉及文件
- `src/pages/mobile/SettingsPage.tsx`
- `src/pages/mobile/HelpPage.tsx`
- `src/pages/mobile/AboutPage.tsx`
