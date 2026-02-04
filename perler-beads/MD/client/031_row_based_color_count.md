# 横排计数色号显示优化

## 日期
2026-01-30

## 问题描述
用户反馈制作模式页面每个格子都显示完整色号（如 H7、H7、H7...），视觉上不够清爽，希望改为按横排进行计数显示。

## 需求说明
参考其他拼豆图纸的做法，采用横排计数方式显示色号：
- 每行开始时重置计数
- 段首（颜色变化时）显示完整色号
- 同色后续格子显示序号（2, 3, 4...）
- 当计数超过 99 时，重新显示色号并重置计数

### 示例
```
原来：H7, H7, H7, H7, H7, H13, H13, H13, H13, H13, H13, H13, H13, H13, H13, H13, H7, H7, H7
现在：H7, 2, 3, 4, 5, H13, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, H7, 2, 3
```

## 解决方案

### 修改文件

#### 1. `src/pages/mobile/MakingPage.tsx` - 制作模式页面
修改色号绘制逻辑，实现横排计数：

```typescript
for (let y = 0; y < height; y++) {
  let currentColorId = '';  // 当前段的原始色号
  let segmentCount = 0;     // 当前段计数

  for (let x = 0; x < width; x++) {
    // ... 获取珠子信息 ...

    // Perler 色号转换：80-19001 → P01, 80-15265 → P265
    let displayColorId = bead.id;
    if (bead.id.startsWith('80-19') || bead.id.startsWith('80-15')) {
      const numPart = bead.id.slice(5);
      displayColorId = 'P' + parseInt(numPart, 10).toString();
    }

    // 按横排计数显示：段首显示色号，后续显示序号
    let displayText = '';
    if (bead.id !== currentColorId || segmentCount >= 99) {
      currentColorId = bead.id;
      segmentCount = 1;
      displayText = displayColorId;
    } else {
      segmentCount++;
      displayText = segmentCount.toString();
    }

    ctx.fillText(displayText, px, py);
  }
}
```

#### 2. `src/services/colorMatchService.ts` - 导出图片功能
修改 `renderBeadsToCanvas` 函数，使导出的图片也使用横排计数方式：

- 将色号显示逻辑从内层循环提取为单独的处理块
- 实现与制作模式相同的横排计数逻辑
- 透明珠子会重置计数器

## 适用范围
| 功能 | 是否应用横排计数 |
|------|------------------|
| 制作模式页面 | ✅ 是 |
| 导出/下载图片 | ✅ 是 |
| 编辑器页面 | ❌ 否（保持原样）|

## 测试结果
- ✅ 制作模式页面正确显示横排计数
- ✅ 每行开始时重置计数
- ✅ 颜色变化时显示新色号
- ✅ 同色后续显示序号（2, 3, 4...）
- ✅ Perler 色号正确转换（P90, P262 等）
- ✅ 导出图片功能也使用相同的计数方式

## 备注
- 此优化使图纸更加清爽易读
- 方便用户在制作时快速确认珠子数量
- 计数超过 99 时自动重置，避免数字过长
