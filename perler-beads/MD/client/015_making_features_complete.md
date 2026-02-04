# 制作功能完善 - 进度恢复、屏幕常亮、快速跳转

## 日期
2026-01-25

## 需求
让用户能真正使用生成的拼豆图案进行制作：
1. 使用编辑好的拼豆图制作拼豆作品
2. 中途退出后，下次可以从上次完成的部分继续
3. 管理方案（查看、删除、继续制作）

## 修改内容

### 1. 进度恢复功能

**文件**: `src/pages/mobile/MakingPage.tsx`

从 ProfilePage 继续制作时，恢复之前保存的进度：
- mode (逐行/区块模式)
- currentIndex (当前行/区块索引)
- completedItems (已完成的行/区块)
- blockSize (区块大小)

```typescript
interface LocationState {
  beadData: BeadPixelData;
  colorCount?: number;
  projectId?: number;
  savedProgress?: {
    mode: 'row' | 'block';
    currentIndex: number;
    completedItems: number[];
    blockSize: number;
  };
}

const [mode, setMode] = useState<MakingMode>(savedProgress?.mode || 'row');
const [currentIndex, setCurrentIndex] = useState(savedProgress?.currentIndex || 0);
const [completedItems, setCompletedItems] = useState<Set<number>>(
  new Set(savedProgress?.completedItems || [])
);
```

### 2. 屏幕常亮功能 (Wake Lock API)

防止制作时手机自动息屏：

```typescript
// Wake Lock API
const toggleWakeLock = useCallback(async () => {
  if (wakeLockActive && wakeLockRef.current) {
    await wakeLockRef.current.release();
    setWakeLockActive(false);
  } else {
    if ('wakeLock' in navigator) {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setWakeLockActive(true);
    }
  }
}, [wakeLockActive]);
```

### 3. 快速跳转功能

输入行号/区块号直接跳转：

```typescript
const handleJump = useCallback(() => {
  const value = parseInt(jumpValue, 10);
  const total = totalItems();
  if (isNaN(value) || value < 1 || value > total) {
    alert(`请输入 1 到 ${total} 之间的数字`);
    return;
  }
  setCurrentIndex(value - 1);
  setShowJumpInput(false);
}, [jumpValue, totalItems]);
```

## 测试结果

| 测试项 | 结果 |
|--------|------|
| 创建方案 API | ✅ |
| 保存进度 API | ✅ |
| 方案列表显示 | ✅ |
| 继续制作 | ✅ |
| 进度恢复 | ✅ 恢复到第 4 行，已完成 3 行 |
| 快速跳转 | ✅ 从第 4 行跳转到第 7 行 |
| 屏幕常亮 | ✅ 按钮显示正常 |

## 截图
- `TEMP/making_progress_restored.png` - 进度恢复成功
- `TEMP/making_jump_success.png` - 快速跳转成功

## 用户流程

```
编辑器 → 点击"开始制作" → 保存方案弹窗 → 输入名称 → 跳转制作页
                                                      ↓
我的页面 ← 返回（自动保存进度）← 制作页 → 点击"完成继续"
    ↓
点击方案卡片 → 加载方案详情 → 跳转制作页（恢复进度）
```

## 新增 UI 元素

1. **屏幕常亮按钮** - 闪电图标，点击切换开启/关闭
2. **快速跳转按钮** - 放大镜图标，点击弹出输入框
3. **跳转弹窗** - 输入行号，支持 Enter 确认、Esc 取消
