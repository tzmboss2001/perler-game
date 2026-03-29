# 编辑页预览自由拖拽不再回弹

## 本次修改

1. 将预览画布容器从 `flex + margin:auto + overflow:auto` 改为绝对定位居中基准
2. 画布位置统一通过 `translate(calc(-50% + offsetX), calc(-50% + offsetY))` 控制
3. 预览容器改为 `overflow: hidden`
4. 删除拖拽开始时对滚动位置的依赖，避免自由拖拽和自动居中/滚动逻辑互相打架
5. 将原先基于 `scrollLeft/scrollTop` 的居中同步逻辑改为仅更新画布尺寸记录，不再干预拖拽位置

## 修复效果

- 预览图拖出预览区域后不会再被强制拉回初始位置
- 上下左右拖拽都保持为真正的自由偏移

## 影响文件

- `perler-beads/src/components/InteractiveCanvas.tsx`

## 验证

- 执行 `cmd /c npm run build`
- 构建通过
