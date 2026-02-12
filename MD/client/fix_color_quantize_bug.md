# 修复颜色量化溢出 Bug

## 日期
2024-02-05

## 问题描述
在 `colorExtractService.ts` 的颜色提取功能中，量化函数产生了无效的 RGB 值（256），导致：
- RGB 值超出有效范围 [0, 255]
- Hex 颜色代码格式错误（如 `#1009000` 而不是 `#ff9000`）
- 3D 模型显示为白色/灰色，而不是正确的橙色

## 原因分析
量化函数 `Math.round(v / 8) * 8` 当输入值为 255 时：
```
Math.round(255 / 8) * 8 = Math.round(31.875) * 8 = 32 * 8 = 256
```
产生了超出有效范围的值 256。

## 修复方案
在量化函数中添加 `Math.min(255, ...)` 来限制最大值：

```typescript
// 修复前
const quantize = (v: number) => Math.round(v / 8) * 8;

// 修复后
const quantize = (v: number) => Math.min(255, Math.round(v / 8) * 8);
```

## 修改文件
- `src/services/template/colorExtractService.ts` - 第 129 行

## 测试验证
1. 访问 `/mobile/3d/template-flow`
2. 上传包含橙色的图片
3. 确认控制台日志中的 RGB 值都在 [0, 255] 范围内
4. 确认 Hex 颜色代码格式正确（如 `#ff9000`）
5. 确认 3D 模型显示正确的颜色
