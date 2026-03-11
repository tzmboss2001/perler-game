# 编辑页滑杆拖动中误触发实时重生成修复

日期：2026-03-09
范围：客户端

## 问题

在编辑图案页面拖动“画布宽度”“鲜艳度”等滑杆时，预览图会在拖动过程中立刻重新生成，用户还没松手，画面就不断刷新，体验很差。

## 根因

- 编辑页初始化生成图案的逻辑依赖了 `processImage`
- 而 `processImage` 又依赖 `gridSize`、`saturationBoost`、`vibrancyPreference` 等滑杆参数
- 结果是滑杆每变一次值，初始化 effect 就会再次触发，形成“拖动中实时重生成”

## 处理

增加图片初始化执行锁：

- 仅当 `imageData` 真的变化时才执行初始化生成
- 同一张图片在编辑过程中，滑杆变化只更新当前参数显示
- 等用户松手后，再通过原有 `handleRegenerate` 执行一次正式重生成

## 修改文件

- `perler-beads/src/pages/mobile/EditorPage.tsx`

## 验证

- 执行 `npm run build`，构建通过
- 发布到公网 `app-pd.shop888.vip`

## 结果

编辑页拖动滑杆时不再边拖边重生成，用户可以先把滑杆调到目标位置，松手后再统一应用。
