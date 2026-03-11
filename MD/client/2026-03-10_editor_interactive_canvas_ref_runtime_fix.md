## 本次修改

### 问题
- MCP 在“裁剪图片 -> 编辑图案”链路中抓到运行时错误：
  - `Uncaught ReferenceError: interactiveCanvasRef is not defined`
- 结果是编辑页在运行时崩掉，裁剪确认后无法正常进入编辑图案。

### 原因
- `EditorPage.tsx` 中已经使用了 `interactiveCanvasRef.current` 来控制预览缩放。
- 也已经把 `ref={interactiveCanvasRef}` 传给了 `InteractiveCanvas`。
- 但组件顶部漏掉了 `const interactiveCanvasRef = useRef<InteractiveCanvasHandle>(null);` 这一行定义。

### 修复
- `perler-beads/src/pages/mobile/EditorPage.tsx`
  - 补上 `interactiveCanvasRef` 的 `useRef` 定义。

### 验证
- `npm run build` 通过。
- 待 MCP 再次走完整链路确认运行时恢复正常。

