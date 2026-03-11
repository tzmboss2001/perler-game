## 本次修改

### 目标
- 将编辑图案页面的预览缩放控件从预览区域剥离，归入下方编辑区域。
- 将拼豆板建议并入左侧“珠子统计”面板，减少预览区下方占用。
- 修复编辑页与预览组件中因历史乱码导致的字符串、标签闭合与样式异常，恢复可构建状态。

### 实际改动
- `perler-beads/src/pages/mobile/EditorPage.tsx`
  - 预览区域内的重复缩放控件已移除。
  - 下方编辑区新增统一的“预览缩放”控制项，和“画布宽度”“鲜艳度”同级。
  - “珠子统计”浮层中新增：
    - 图案尺寸
    - 拼豆板建议
  - 修复多处乱码文案、坏掉的 JSX 标签和损坏的样式值。
- `perler-beads/src/components/InteractiveCanvas.tsx`
  - 增加 `ref` 控制接口，支持外部统一控制缩放。
  - 内置缩放控件可通过 `showControls` 开关关闭。
  - 修复预览组件内坏掉的按钮文案和属性字符串。

### 拼豆板说明
- 当前“104钉”不是写死的。
- 编辑页通过 `recommendBoard(width, height)` 动态计算拼豆板建议，依据的是当前图案宽高。
- 相关逻辑文件：`perler-beads/src/services/boardService.ts`

### 验证
- `npm run build` 通过。

