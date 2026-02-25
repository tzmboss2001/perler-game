# 4个较高优先级问题修复（2026-02-25）

## 1. 上传图片添加文件大小校验

### 问题
CreatePage 提示"最大10MB"但没有实际校验，超大图片可能导致浏览器卡死。

### 修复
`handleFileSelect()` 中添加 `file.size > 10MB` 检查，超出时 alert 提示并清空 input。

### 修改文件
- `CreatePage.tsx`

---

## 2. 制作模式添加"适应屏幕"按钮

### 问题
只有 +/− 缩放按钮，用户放大后无法一键回到全图视图。

### 修复
- 新增 `handleFitScreen()` 函数，重置 scale 到适应屏幕的值并清零 translateX/Y
- 缩放控制区新增"适应"按钮

### 修改文件
- `MakingPage.tsx`

---

## 3. 统一色号显示格式

### 问题
Perler 品牌色号被特殊转换为 "P001" 格式，MARD 直接显示 "H9" 等，视觉不统一。

### 修复
去掉 Perler 特殊转换逻辑，所有品牌统一直接显示原始 ID。MARD 色号本身已足够简短。

### 修改文件
- `MakingPage.tsx`

---

## 4. 编辑器颜色统计显示全部颜色

### 问题
`statistics.slice(0, 20)` 只显示前20种颜色，超出部分用户无法查看和操作。

### 修复
- 去掉 `.slice(0, 20)` 限制，显示全部颜色
- `maxHeight` 从 140px 增大到 200px，列表可滚动

### 修改文件
- `EditorPage.tsx`

---

## 验证
- `npm run build` 编译通过 ✅
