# 编辑图案页悬浮色系与统计面板小屏响应式收口

## 本次目标
- 解决编辑图案页左侧悬浮色系/统计按钮与右侧浮层在窄屏手机上把内容区压得过窄的问题。
- 保证小屏下仍能正常打开并阅读色系设置和豆子统计。

## 本次修改
- 文件：`perler-beads/src/pages/mobile/EditorPage.tsx`
- 复用已有 `viewportWidth`，为悬浮工具区增加两档小屏适配：
  - `<= 390px`：右侧浮层整体左移，给内容更多宽度
  - `<= 360px`：左侧按钮堆栈进一步缩小，浮层内边距和间距同步压缩
- 调整了以下区域的小屏样式：
  - `floatingUtilityStack`
  - `floatingUtilityBtn`
  - `floatingPanel`
  - `floatingPanelHeader`
  - `floatingPanelActions`

## 结果
- 窄屏下，左侧悬浮按钮不再占掉过多可视宽度。
- 色系设置和豆子统计面板获得更大的正文空间。
- 面板头部在极窄屏下允许换行，关闭按钮和操作区不会再把标题挤断。

## 验证
- 执行：`cmd /c npm run build`
- 结果：构建通过

## 当前状态
- 仅本地完成
- 未发布公网
