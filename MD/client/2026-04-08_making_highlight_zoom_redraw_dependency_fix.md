# 2026-04-08 制作模式缩放高亮重绘依赖收口

## 问题
制作模式在缩放开始时，底图和高亮层虽然已经处于同一个 stage 中，但高亮区仍会出现短暂不同步。根因是底图和 overlay 的重绘 effect 仍然错误依赖 `scale`、`translateX`、`translateY` 和 `renderMetrics` 对象，导致缩放每一帧都会触发重新清空和重绘 overlay，从而在视觉上出现慢半拍。

## 修复
1. 去掉底图渲染 effect 对 `renderMetrics` 对象的依赖，只保留真正影响底图内容的安全渲染尺寸依赖。
2. 去掉 overlay 渲染 effect 对 `scale`、`translateX`、`translateY` 和 `renderMetrics` 对象的依赖。
3. overlay 现在只在以下内容变化时重绘：
   - 图案数据
   - 显示区域
   - 现实豆板分区
   - 选中状态
   - 当前板聚焦
   - 色号显示
   - 安全渲染尺寸变化
4. 补上 overlay effect 对 `getColorIndicesInBlock` 的显式依赖，避免颜色高亮逻辑使用旧闭包。

## 结果
缩放和平移由共享的 `canvasStage` 统一处理，高亮层不再在缩放的每一帧单独重绘，减少了“缩放开始时高亮区慢半拍”的视觉不同步。
