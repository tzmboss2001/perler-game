# Perler 色号显示格式修复

## 日期
2026-01-28

## 问题描述
用户反馈制作模式页面的色号显示不清，部分色号太长导致相邻格子的色号重叠。

### 问题原因
Perler 品牌的珠子在数据中使用的是**产品编号（SKU）**而不是**色号**：
- 产品编号格式：`80-19090`、`80-15265`（8个字符）
- 官方色号格式：`P90`、`P265`（2-4个字符）

参考资料：https://www.beadmymood.com/perler-bead-color-chart/

### 各品牌色号长度对比

| 品牌 | 修复前格式 | 修复后格式 | 字符数 |
|------|-----------|-----------|--------|
| Perler | 80-19090 | P90 | 8→3 |
| Perler | 80-15265 | P265 | 8→4 |
| Artkal C | C73 | C73 | 3 |
| Hama | H61 | H61 | 3 |

## 解决方案

在 `MakingPage.tsx` 中添加显示转换逻辑，将产品编号转换为色号格式：

```typescript
// Perler 色号转换：80-19001 → P01, 80-15265 → P265
let displayId = bead.id;
if (bead.id.startsWith('80-19') || bead.id.startsWith('80-15')) {
  const numPart = bead.id.slice(5); // 取最后3位数字
  displayId = 'P' + parseInt(numPart, 10).toString(); // 去掉前导零
}
ctx.fillText(displayId, px, py);
```

### 转换规则
- `80-19001` → 去掉 `80-19`，取 `001`，去前导零 → `P1`
- `80-19012` → 去掉 `80-19`，取 `012`，去前导零 → `P12`
- `80-15265` → 去掉 `80-15`，取 `265` → `P265`

## 修改文件
- `src/pages/mobile/MakingPage.tsx` - 制作模式页面色号显示
- `src/components/ShoppingListModal.tsx` - 采购清单色号显示（2026-01-29 补充修复）

## 测试结果
- ✅ Perler 色号正确转换（P90, P262, P255 等）
- ✅ Artkal 和 Hama 色号保持不变
- ✅ 色号显示不再重叠

## 备注
- 数据源（beadColors.ts）保留原始产品编号，用于其他用途（如购买链接查询）
- 仅在界面显示时进行转换
