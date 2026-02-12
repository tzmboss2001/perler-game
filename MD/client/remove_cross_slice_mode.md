# 移除十字插片模式

## 日期: 2026-02-11

## 原因

十字插片模式经验证只能产生骨架（几个薄片交叉），无法生成用户期望的实心3D拼豆模型。等高线镂空模式才是正确的方案。

## 移除内容

### 删除的组件
- `SliceThumbnail` — 十字切片缩略图组件
- `SliceDetailModal` — 十字切片详情弹窗

### 删除的状态
- `sliceMode: SliceMode` — 切片模式切换（'cross' | 'contour'）
- `slicesX`, `slicesZ` — X/Z方向切片数参数
- `slices: SlicePiece[]` — 十字切片结果
- `selectedSlice: SlicePiece | null` — 选中的十字切片

### 删除的UI
- 切片模式切换按钮（"+ 十字插片" / "◯ 等高线镂空"）
- X/Z方向切片数滑动条
- 十字切片结果展示区（X/Z方向切片列表 + 统计）
- `StackedSliceViewer` 3D叠加预览（十字切片专用）
- 十字切片详情弹窗

### 删除的导入
- `StackedSliceViewer` 组件
- `generateCrossSlices`, `renderSliceToCanvas`, `getSliceStats`, `SlicePiece` from crossSliceService

### 删除的样式
- `modeBtn` — 模式切换按钮样式
- `modeBtnActive` — 模式切换按钮激活样式

### 简化的逻辑
- `handleGenerate()` — 移除 `if (sliceMode === 'cross')` 分支，直接执行等高线切片
- 生成按钮 — 固定绿色渐变，文案固定为"开始生成等高线"
- 进度条 — 固定绿色渐变
- 副标题 — 固定为"GLB模型 → 等高线镂空图纸"

## 修改文件

| 文件 | 修改 |
|------|------|
| `ModelTo3DPage.tsx` | 移除所有十字插片相关代码 |

## 保留的文件（未删除）

- `src/services/3d/crossSliceService.ts` — 十字切片算法服务（代码保留但不再被引用）
- `src/components/3d/StackedSliceViewer.tsx` — 十字切片叠加预览组件（代码保留但不再被引用）

这些文件暂时保留，如果确认不需要可以后续清理。
