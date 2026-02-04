# 导出图纸集成珠子清单

## 日期
2024年

## 需求背景
用户下载图纸后还需要单独下载珠子清单，操作繁琐。希望在导出的图纸右侧直接显示珠子清单，一张图包含所有信息。

## 实现方案

### 1. 新增渲染函数 `renderBeadsToCanvasWithList`

在 `colorMatchService.ts` 中新增函数，支持在图纸右侧绘制珠子清单：

```typescript
export const renderBeadsToCanvasWithList = (
  beadData: BeadPixelData,
  canvas: HTMLCanvasElement,
  cellSize: number = 20,
  showGrid: boolean = true,
  showColorCode: boolean = false,
  showMajorGrid: boolean = false,
  showBeadList: boolean = true
): void => {
  // 计算清单宽度和布局
  // 绘制图案部分
  // 绘制珠子清单（右侧）
}
```

### 2. 清单布局设计

| 区域 | 内容 |
|------|------|
| 标题 | "珠子清单" |
| 基本信息 | 尺寸、珠子总数、颜色种类 |
| 分隔线 | --- |
| 颜色列表 | 色块 + 颜色名 + 数量 |

清单宽度和字体大小根据 cellSize 动态调整，确保各分辨率下显示效果一致。

### 3. 修改 ExportModal.tsx

- 新增 `showBeadList` 状态（默认开启）
- 添加"显示珠子清单"开关
- 根据选项调用相应的渲染函数

## 涉及文件

1. `src/services/colorMatchService.ts` - 新增 `renderBeadsToCanvasWithList` 函数
2. `src/components/ExportModal.tsx` - 添加开关选项

## 导出选项

现在导出弹窗有以下选项：
- [x] 显示网格线
- [x] 显示坐标刻度
- [x] 显示大网格线（5×5蓝线 + 10×10黑线）
- [x] 显示珠子清单（在图纸右侧显示颜色列表）← 新增

## 效果说明

- 开启"显示珠子清单"后，导出的图片右侧会显示完整的颜色清单
- 清单包含：尺寸、总珠子数、颜色种类、每种颜色的色块/名称/数量
- 用户无需再单独下载清单，一张图包含所有制作信息
