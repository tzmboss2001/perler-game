# 修复制作进度保存问题

## 日期
2026-01-25

## 问题描述
用户在制作页面点击"完成继续"后，如果立即点击返回按钮，进度不会保存。

## 问题原因
原来的保存逻辑使用了 **2秒防抖**：
```javascript
// 原代码 - 防抖2秒
useEffect(() => {
  const timer = setTimeout(() => {
    projectApi.updateProgress(...);
  }, 2000);
  return () => clearTimeout(timer);
}, [currentIndex, completedItems]);
```

如果用户在2秒内点击返回，防抖 timer 被清除，保存请求就不会发出。

## 解决方案
在 `handleCompleteAndNext` 函数中**立即保存**进度，不依赖防抖：

```javascript
const handleCompleteAndNext = () => {
  const newCompletedItems = new Set(completedItems).add(currentIndex);
  setCompletedItems(newCompletedItems);

  const nextIndex = currentIndex < totalItems() - 1 ? currentIndex + 1 : currentIndex;
  if (currentIndex < totalItems() - 1) {
    setCurrentIndex(nextIndex);
    setSelectedBeadIndex(null);
  }

  // 立即保存进度到服务器
  if (projectId) {
    projectApi.updateProgress(projectId, {
      progress: {
        mode,
        currentIndex: nextIndex,
        completedItems: Array.from(newCompletedItems),
        blockSize,
      },
    }).catch(err => {
      console.error('保存进度失败:', err);
    });
  }
};
```

## 修改文件
- `src/pages/mobile/MakingPage.tsx` - `handleCompleteAndNext` 函数

## 测试结果
| 测试项 | 结果 |
|--------|------|
| 点击"完成继续"3次 | 进度从 25% → 34% |
| 立即点击返回 | 进度保存成功 |
| 再次进入制作页 | 从第12行继续 |
