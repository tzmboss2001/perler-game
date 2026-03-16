# 2026-03-16 制作模式返回来源页修复

## 问题
- 从编辑图案页保存方案进入制作模式后，点击左上角返回，没有回到用户进入制作模式前的页面。
- 用户从不同入口进入制作模式时，返回行为不一致，容易直接落回上传图片页。

## 修复
- 为进入制作模式的主要入口统一增加 `backTarget` 状态。
- 制作模式左上角返回按钮优先跳回 `backTarget`。
- 当前已覆盖的入口：
  - 编辑图案页 -> 返回 ` /mobile/create `
  - 我的方案页 -> 返回 ` /mobile/profile `
  - 社区作品详情 -> 返回当前社区作品详情页
  - 模板详情 -> 返回当前模板详情页
- 如果没有显式来源：
  - 有方案 ID 时回我的页面
  - 否则回创建页

## 修改文件
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/pages/mobile/EditorPage.tsx`
- `perler-beads/src/pages/mobile/ProfilePage.tsx`
- `perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
- `perler-beads/src/pages/mobile/TemplateDetailPage.tsx`

## 结果
- 制作模式返回行为改为“从哪来回哪去”。
- 用户从编辑页进制作模式，会返回编辑链路；从我的方案进制作模式，会返回我的方案页。
