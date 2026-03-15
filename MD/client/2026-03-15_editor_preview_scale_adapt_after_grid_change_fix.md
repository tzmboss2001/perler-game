# 2026-03-15 编辑页作品宽度变更后预览缩放适配修复

## 问题
- 编辑图案页通过滑杆调整作品宽度后，预览区缩放没有按新的图案尺寸正确适配。
- 用户如果之前放大过预览，重新生成后会直接掉回不合理的缩放状态，导致预览图显得过小。
- 同时，编辑页“预览缩放”滑杆调用了不存在的 `setZoom`，会在控制台持续报错。

## 原因
- `InteractiveCanvas` 在 `beadData` 宽高变化后，只会直接把缩放重置到新的 `fitScale`。
- 这种处理没有保留用户当前的相对缩放意图，作品宽度变化后容易出现预览突然变小。
- 编辑页缩放滑杆与 `InteractiveCanvasHandle` 的方法名不一致，实际暴露的是 `setZoomPercent`。

## 修复
- 为 `InteractiveCanvas` 增加旧图案尺寸记录。
- 在图案宽高变化后，先计算旧图案的 `fitScale`，再根据当前缩放相对于旧 `fitScale` 的比例，换算到新图案的 `fitScale`。
- 首次初始化仍然直接使用新的 `fitScale`，避免首次进入异常。
- 最终仍会用新的 `minScale/maxScale` 做边界钳制。
- 把编辑页预览缩放滑杆调用从 `setZoom` 改为正确的 `setZoomPercent`。

## 修改文件
- `perler-beads/src/components/InteractiveCanvas.tsx`
- `perler-beads/src/pages/mobile/EditorPage.tsx`

## 验证
- `npm run build` 通过。
- MCP 复查确认编辑页已不再出现 `interactiveCanvasRef.current?.setZoom is not a function` 报错。
