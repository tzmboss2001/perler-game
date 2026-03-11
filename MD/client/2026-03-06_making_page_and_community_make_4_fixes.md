# 2026-03-06 真机制作页与社区制作链路修复（4项）

## 问题1：制作模式在真机右侧显示不全
- 原因：初始“适应屏幕”只按高度计算，并且最小缩放被限制为 `>=100%`，宽图在窄屏会被裁掉右侧。
- 修复：改为同时按宽高计算适配比例，取更小值；初始与“适应”按钮都允许低于100%（受 `MIN_SCALE` 控制）。

## 问题2：放大后网格线变成条带
- 原因：网格线宽度随 `scale` 线性变粗。
- 修复：网格线改为“视觉恒细”策略，线宽按缩放反比衰减，避免放大后变粗。

## 问题3：社区点击制作后出现测试图而非真实作品
- 修复项A：`CommunityDetailPage` 的 `bead_data` 解析改为兼容两种结构：
  1) 坐标结构 `{x,y,colorId}`
  2) 扁平数组结构（长度 = `width*height`）
- 修复项B：社区制作草稿缓存升级为带 `version/source/postId/savedAt` 的对象，降低读取旧缓存串数据风险。
- 修复项C：`MakingPage` 的测试数据仅在 `DEV` 且 `?test=1` 时可用，生产环境禁用测试兜底，避免误入“笑脸测试图”。

## 问题4：真机制作页看不到横幅广告
- 原因：未配置 `VITE_AD_MODE` 时生产环境默认 `off`。
- 修复：默认模式改为 `mock`，未配置也能显示广告位占位节点，便于真机验证广告触达链路。

## 修改文件
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- `perler-beads/src/config/monetization.ts`

## 验证
- 本地构建：`cmd /c npm run build` 通过。
- 前端已发布到：`http://app-pd.shop888.vip`

## 备注
- 本次发布后，制作页右侧显示、缩放网格线、社区制作数据、广告占位均已进入可真机验证状态。
