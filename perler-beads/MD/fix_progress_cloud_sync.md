# 功能：制作进度云端同步

## 日期
2026-02-02

## 功能描述
用户在制作模式选中区块或颜色后，进度自动保存到云端，下次进入时自动恢复。

## 实现方案

### 1. 进度数据格式
```typescript
interface Progress {
  selectionType: 'block' | 'color' | null;
  blockX: number;
  blockY: number;
  colorHex?: string;
  colorId?: string;
  timestamp: number;
}
```

### 2. 保存时机
- 用户选中/取消选中区块或颜色时
- 页面切到后台时 (visibilitychange)
- 页面关闭时 (pagehide)

### 3. 恢复优先级
1. 优先使用云端进度（从方案详情获取）
2. 其次使用本地 localStorage

## 修改文件

### projectApi.ts
- 更新 `UpdateProgressReq` 接口格式
- 更新 `ProjectInfo.progress` 类型

### MakingPage.tsx
- `LocationState` 添加 `savedProgress` 字段
- `saveSelectionState` 函数添加云端同步逻辑
- 恢复进度时优先使用云端数据

### ProfilePage.tsx
- 已有传递 `savedProgress` 的逻辑，无需修改

## 测试结果
1. ✅ 选中区块，进度同步到云端
2. ✅ 数据库保存进度 JSON
3. ✅ 离开再进入，进度自动恢复
