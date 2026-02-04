# 优化：底部导航栏标准化与美化

## 日期
2026-02-02

## 需求
1. 按照标准尺寸优化底部导航栏（约 56px + safe-area）
2. 美化"创作"按钮，使其成为视觉焦点
3. 所有页面都显示导航栏，让用户知道当前所在位置
4. 正确的高亮状态（制作页面属于"创作"，设置页面属于"我的"）

## 修改内容

### 1. 创建独立的 BottomNav 组件

**文件**: `src/components/BottomNav.tsx`

**功能**:
- 独立的底部导航组件，可在任何页面使用
- 路径映射：自动判断当前页面属于哪个导航项
- "创作"按钮特殊样式（更大、渐变背景）
- 激活状态指示点

**路径映射**:
```typescript
const pathToNav: Record<string, string> = {
  '/mobile/home': '/mobile/home',
  '/mobile/create': '/mobile/create',
  '/mobile/editor': '/mobile/create',   // 编辑器属于"创作"
  '/mobile/making': '/mobile/create',   // 制作模式属于"创作"
  '/mobile/profile': '/mobile/profile',
  '/mobile/settings': '/mobile/profile', // 设置属于"我的"
  '/mobile/help': '/mobile/profile',     // 帮助属于"我的"
  '/mobile/about': '/mobile/profile',    // 关于属于"我的"
  '/mobile/login': '/mobile/profile',    // 登录属于"我的"
};
```

### 2. 更新 MobileLayout.tsx

- 导航栏高度优化为标准尺寸
- 中间"创作"按钮特殊样式
- 使用 `Plus` 图标替代 `PlusCircle`

### 3. 更新 MakingPage.tsx

- 添加 BottomNav 组件
- 调整底部操作栏位置，给导航栏留出空间

## 导航栏设计

```
┌──────────────────────────────────────────┐
│                                          │
│              页面内容                     │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│   🏠        ┌────────┐        👤         │
│  首页       │   +    │       我的         │
│   ·         └────────┘                   │  ← 激活指示点
└──────────────────────────────────────────┘
```

## 尺寸对比

| 项目 | 修改前 | 修改后 | 标准 |
|------|--------|--------|------|
| 导航栏高度 | ~92px | ~60px | 56px |
| 图标盒子 | 44px | 48px(中)/24px(侧) | - |
| 底部 padding | ~16px | ~10px | - |

## 涉及文件
- `src/components/BottomNav.tsx` (新建)
- `src/pages/mobile/MobileLayout.tsx`
- `src/pages/mobile/MakingPage.tsx`
