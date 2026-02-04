# 大网格线功能添加

## 日期
2024年

## 需求背景
用户反馈下载的制作图没有大网格线，希望添加：
- 10×10 大网格线（粗线，红色）
- 5×5 中等网格线（稍细，蓝色）

同时在制作界面的预览图也添加同样的网格线辅助定位。

## 实现方案

### 1. 修改 colorMatchService.ts

为 `renderBeadsToCanvas` 函数添加 `showMajorGrid` 参数：

```typescript
export const renderBeadsToCanvas = (
  beadData: BeadPixelData,
  canvas: HTMLCanvasElement,
  cellSize: number = 20,
  showGrid: boolean = true,
  showColorCode: boolean = false,
  showMajorGrid: boolean = false  // 新增参数
): void => {
  // ...

  if (showGrid) {
    // 基础细网格线（每1格）- 黑色半透明

    if (showMajorGrid) {
      // 5×5 中等网格线（蓝色）
      ctx.strokeStyle = 'rgba(0, 100, 200, 0.5)';

      // 10×10 粗网格线（红色）
      ctx.strokeStyle = 'rgba(200, 50, 50, 0.7)';
    }
  }
}
```

### 2. 修改 ExportModal.tsx

添加"显示大网格线"选项开关：
- 默认开启
- 用户可以手动关闭
- 导出时传递 `showMajorGrid` 参数

### 3. 修改 MakingPage.tsx

制作界面的 Canvas 渲染逻辑中添加 5×5 中等网格线：
- 原有 10×10 大网格线改为红色
- 新增 5×5 蓝色中等网格线

### 4. 修改 InteractiveCanvas.tsx

添加 `showMajorGrid` 属性支持，传递给 `renderBeadsToCanvas`。

## 网格线样式

| 类型 | 间隔 | 颜色 | 线宽 |
|------|------|------|------|
| 基础细线 | 1格 | rgba(0, 0, 0, 0.25) | 1px |
| 中等线 | 5格 | rgba(0, 100, 200, 0.5) 蓝色 | cellSize/10 |
| 粗线 | 10格 | rgba(200, 50, 50, 0.7) 红色 | cellSize/6 |

## 涉及文件

1. `src/services/colorMatchService.ts` - 核心渲染函数
2. `src/components/ExportModal.tsx` - 下载导出弹窗
3. `src/components/InteractiveCanvas.tsx` - 交互式画布组件
4. `src/pages/mobile/MakingPage.tsx` - 制作页面

## 效果说明

- **下载图**：用户可以选择是否显示大网格线，默认开启
- **制作界面**：始终显示大网格线，帮助用户定位当前制作位置
- **编辑界面**：可选显示（通过 `showMajorGrid` 属性控制）
