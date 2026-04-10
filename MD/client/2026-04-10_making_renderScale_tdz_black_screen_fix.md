# 制作模式进入黑屏修复

## 问题
用户在编辑页点击“保存方案制作”进入制作模式时出现黑屏。

## 根因
`MakingPage.tsx` 中有一段 `useEffect` 提前引用了后面才声明的 `renderScale` 常量：
- `renderScaleRef.current = renderScale`
- 但 `const renderScale = renderMetrics?.renderScale ?? 1;` 定义在更后面

这会触发运行时错误：
- `Uncaught ReferenceError: Cannot access 'renderScale' before initialization`

React 在挂载 `MakingPage` 时直接报错，导致制作页根节点空白，看起来就是黑屏。

## 修复
- 将同步 `renderScaleRef` 的 `useEffect` 挪到 `renderScale` 常量定义之后。
- 不改业务逻辑，只修正定义顺序，消除 TDZ 错误。

## 修改文件
- `perler-beads/src/pages/mobile/MakingPage.tsx`

## 验证
- `npm run build` 通过
- MCP 刷新 `mobile/making` 后，控制台不再出现 `Cannot access 'renderScale' before initialization`
- 制作模式页面恢复正常渲染
