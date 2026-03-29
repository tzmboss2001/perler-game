# 2026-03-16 上传图片点击后黑屏修复

## 问题
用户反馈点击上传图片后页面黑屏。

## 根因
`InteractiveCanvas.tsx` 中在 `scaledCellSize` 声明之前，就已经在上方 `useEffect` 内和依赖数组里访问了它，触发运行时错误：

- `Cannot access 'scaledCellSize' before initialization`

该错误会导致相关页面渲染失败，表现为黑屏。

## 修复
- 文件：`perler-beads/src/components/InteractiveCanvas.tsx`
- 将 `scaledCellSize` 的声明提前到首次使用之前。
- 保证后续依赖和计算都在变量初始化之后执行。

## 验证
- `cmd /c npm run build` 通过。
- 创建页与上传进入裁剪链路可继续渲染，不再命中该运行时报错。
