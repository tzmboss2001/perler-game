# 2026-04-05 单板模式第四阶段：主工作区抬升与非核心区下沉

## 本次完成
- 单板模式下隐藏制作页底部广告位，避免广告占用当前板首屏工作区。
- 进一步压缩单板模式顶部总览区：
  - 总览外层间距和内边距继续减小。
  - 单板摘要卡与操作按钮高度继续降低。
  - 板切换 chips 继续做薄。
  - 总览缩略图宽度与高度继续压缩。
- 提高单板模式主预览区的保底高度：
  - `canvasContainer` 最小高度从 `clamp(360px, 56vh, 620px)` 提高到 `clamp(420px, 68vh, 760px)`。
- 进一步减小单板模式画布顶部 chrome 偏移，使当前板更早顶上来。

## 关键代码
- 文件：[MakingPage.tsx](D:/work/web/perler-beads-creator/perler-beads/src/pages/mobile/MakingPage.tsx)
- 主要调整点：
  - `singleBoardChromeOffset`
  - `canvasContainerStyle`
  - `singleBoardOverview`
  - `singleBoardHeroRow`
  - `singleBoardSummaryCard`
  - `singleBoardMiniMapCard`
  - `singleBoardGrid`
  - 单板模式下条件隐藏 `BannerAd placement="making_bottom"`

## MCP 验证
- 页面：`/mobile/making`
- 仍保持在 `单板模式`
- 当前页首屏已确认：
  - 底部广告位不再出现在单板模式首屏。
  - 顶部总览区域明显缩薄。
  - 当前板主预览区高度明显扩大。
- 通过 DevTools 实测当前板工作区包围盒：
  - 顶部起点：`265.4px`
  - 底部：`697.6px`
  - 高度：约 `432.2px`
  - 当前视口高度：`703px`
- 也就是当前板预览区约占首屏高度的 `61%`，相比前一轮继续上升。

## 当前还差哪些项
1. 单板模式仍然保留了顶部完整的模式切换、摘要、按钮、chips、总览缩略图，虽然已经压缩，但仍占据了明显的纵向空间。
2. 单板模式的缩放与状态提示仍沿用传统模式结构，后续可以进一步针对单板模式做更紧凑的排布。
3. 板级进度体系还不完整：
- 还没有自动切下一块。
- 还没有更强的整体完成率呈现。
- 还没有按板恢复制作入口。

## 下一步
- 第五阶段：继续把单板模式的顶部 chrome 做成更紧凑的“可折叠/可收起”结构，并进一步为当前板让出垂直空间；同时开始补板级进度流转（例如完成后自动切下一块）。
