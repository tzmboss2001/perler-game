# 固定Header实现记录

## 日期
2025-01-25

## 问题描述
用户反馈页面header在滚动时没有固定在顶部，与常规APP/小程序的体验不一致。

## 原因分析
1. 最初尝试使用 `position: sticky`，但由于以下原因失效：
   - MobileLayout的content区域有 `overflowY: 'auto'`，创建了新的滚动容器
   - `position: sticky` 只相对于最近的滚动容器生效，而不是视口

2. 移除 `overflowY: 'auto'` 后，sticky仍然不生效，可能与flex布局嵌套有关

## 解决方案
改用 `position: fixed` 方案：
- 将header设置为 `position: fixed, top: 0, left: 0, right: 0, zIndex: 100`
- 添加 `headerSpacer` 占位元素，防止内容被固定header遮挡
- 移除MobileLayout的 `overflowY: 'auto'` 设置

## 修改的文件

### 核心布局
- `src/pages/mobile/MobileLayout.tsx`
  - 移除 content 样式的 `overflowY: 'auto'`

### 主要页面（添加固定header）
| 文件 | header高度 | headerSpacer |
|------|-----------|--------------|
| HomePage.tsx | ~100px | 100px |
| ProfilePage.tsx | ~60px | 60px |
| CreatePage.tsx | ~56px | 56px |
| LoginPage.tsx | ~72px | 72px |

### 二级页面（添加固定header）
| 文件 | header高度 | headerSpacer |
|------|-----------|--------------|
| SettingsPage.tsx | 56px | 56px |
| AboutPage.tsx | 56px | 56px |
| HelpPage.tsx | 56px | 56px |
| PrivacyPolicyPage.tsx | 56px | 56px |
| UserAgreementPage.tsx | 56px | 56px |

### 编辑器页面
- `EditorPage.tsx` - header改为fixed，previewSection保持sticky（用于编辑时的预览固定）

### 未修改的页面
- `MakingPage.tsx` - 使用100vh flex布局，header通过flexShrink: 0自然固定在顶部

## 样式模板
```typescript
header: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px',
  background: colors.bg.secondary,
  borderBottom: `1px solid ${colors.border.soft}`,
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
},

headerSpacer: {
  height: '56px', // 根据header实际高度调整
},
```

## 测试结果
- HomePage: 滚动后"拼豆工坊"标题栏固定在顶部 ✅
- ProfilePage: "我的"标题栏固定 ✅
- 其他页面: 返回按钮+标题栏固定 ✅

## 注意事项
1. 添加新页面时，记得同时添加header和headerSpacer
2. headerSpacer的高度需要与header实际高度匹配
3. MakingPage等全屏编辑页面使用不同的布局方式，不需要fixed定位
