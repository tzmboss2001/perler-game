# 2026-03-06 制作页顶部右侧按钮被挤出屏幕修复

## 问题
- 真机窄屏下，制作模式顶部控制条横向空间不足，右上角部分按钮显示不全。

## 修复
- `floatingControls` 改为可换行布局（`flexWrap: wrap`）。
- `zoomControls` 改为占满一行并允许横向滚动，避免硬挤压右侧按钮。
- 缩放滑杆宽度改为 `clamp(56px, 22vw, 92px)`，窄屏自适应更稳。
- 右侧按钮组设为 `alignSelf: flex-end` + `marginLeft: auto`，固定可见。

## 修改文件
- `perler-beads/src/pages/mobile/MakingPage.tsx`

## 验证
- 构建通过：`cmd /c npm run build`
- 已发布：`http://app-pd.shop888.vip`
