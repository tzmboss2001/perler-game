# 编辑页删除宽度控件冗余辅助文案

## 本次修改

1. 删除宽度输入框左侧提示：
   - `常用拼豆板宽可直接点滑杆标记`
2. 删除宽度控件下方三段说明：
   - `流畅`
   - `适中`
   - `精细`
3. 删除对应的 `sliderLabelGreen / sliderLabelYellow / sliderLabelRed` 样式

## 调整原因

- 宽度滑杆和标记按钮本身已经足够表达操作方式
- 这几段文案属于重复说明
- 删除后能进一步减少视觉噪音并释放垂直空间

## 影响文件

- `perler-beads/src/pages/mobile/EditorPage.tsx`

## 验证

- 执行 `cmd /c npm run build`
- 构建通过
