# 2026-04-07 单板模式高倍率点击命中修复

## 问题
- 单板模式在高倍率下点击格子时，焦点命中不稳定，用户连续点击同一视觉位置会落到不同格子。

## 根因
- 点击命中逻辑仍使用 `baseCellSize * scale` 推算格子坐标。
- 但制作模式当前已经采用安全渲染 + CSS 缩放，画布真实显示尺寸不再与该公式严格一致。
- 导致高倍率下点击坐标与实际显示格子发生偏移。

## 修复
- 鼠标点击与触摸点击统一改为按 canvas 当前真实显示宽高反推单格宽高。
- 使用 `rect.width / displayWidth` 与 `rect.height / displayHeight` 计算 cellX/cellY。

## 修改文件
- `perler-beads/src/pages/mobile/MakingPage.tsx`

## 验证
- `cmd /c npm run build`
- 后续通过 MCP 在高倍率下重复点击同一区域验证焦点稳定性
