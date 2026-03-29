# 2026-03-23 创建页与制作页广告位占位收口

## 问题
- 制作页虽然有广告组件，但 `adMode=off` 时本地完全看不到广告位。
- 创建页没有接入同类广告位，无法提前验证广告区布局和整站盈利路径。
- 初版开发环境占位样式过于偏提示框，不像正式商业位。

## 处理
- 调整 `perler-beads/src/components/ads/BannerAd.tsx`
  - 开发环境且 `adMode=off` 时显示可见广告位占位。
  - 占位样式改成更接近正式商业位的浅色卡片，提升可读性。
- 修改 `perler-beads/src/pages/mobile/CreatePage.tsx`
  - 在上传页主内容区接入 `BannerAd placement="create_inline"`。

## 结果
- 创建页和制作页现在都能在本地开发环境里直接看到广告位。
- 不需要等真实广告接通，也能先验证页面留白、滚动和视觉层级。
- 正式环境如果 `adMode=off`，依旧不会误显示假广告。
