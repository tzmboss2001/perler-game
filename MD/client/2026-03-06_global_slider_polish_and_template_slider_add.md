# 2026-03-06 全局滑杆统一美化与模板详情页新增滑杆

## 诉求
- 滑杆太粗，需要更精致。
- 除制作页外，其他页面也希望增加/统一滑杆体验。

## 本次改动
### 1) 全局滑杆样式（细轨道 + 轻量圆形拇指）
- 新增文件: `perler-beads/src/styles/range-slider.css`
- 覆盖范围: 全项目 `input[type="range"]`
- 样式特征:
  - 轨道高度 3px
  - 拇指 14px
  - 渐变轨道 + 细边框 + 轻阴影
  - 兼容 WebKit / Firefox

### 2) 全局引入
- 文件: `perler-beads/src/main.tsx`
- 新增: `import './styles/range-slider.css';`

### 3) 模板详情页新增可拖动滑杆缩放
- 文件: `perler-beads/src/pages/mobile/TemplateDetailPage.tsx`
- 原来: 仅 +/- 按钮 + 进度条展示
- 现在: 增加 `range` 滑杆（0.5~4，步进 0.05），可直接拖动调倍率

## 当前效果
- 制作页、编辑页、3D相关页、智能合并页等已有 range 的地方都会自动变细并统一风格。
- 模板详情页新增了直接拖动缩放，不再只能点按钮。

## 验证
- `npm run build` 通过。
