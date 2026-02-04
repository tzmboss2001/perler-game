# 修复色板颜色数量不一致问题

**日期**: 2026-01-24
**修改文件**: `src/data/beadColors.ts`

## 问题描述

用户发现在创建图案界面显示的色板颜色数量与编辑界面实际可用的颜色数量不一致：

- CreatePage 显示：Artkal 225色、Perler 100色、Hama 64色
- EditorPage 实际只有约 60 色可选

## 问题原因

`beadBrands` 数组中的 `colorCount` 字段使用的是品牌的**官方完整色板数量**，但代码中实际实现的颜色数组只包含**常用核心色**：

| 品牌 | 官方色数 | 实际代码 |
|------|---------|---------|
| Artkal | 225 | 60 色 (A01-A60) |
| Perler | 100 | 60 色 (P01-P60) |
| Hama | 64 | 48 色 (H01-H48) |

## 解决方案

更新 `beadBrands[].colorCount` 为实际代码中可用的颜色数量：

```typescript
// 修改前
{ id: 'artkal', colorCount: 225, ... },
{ id: 'perler', colorCount: 100, ... },
{ id: 'hama', colorCount: 64, ... },

// 修改后
{ id: 'artkal', colorCount: 60, ... },  // 实际 artkalColors 数组长度
{ id: 'perler', colorCount: 60, ... },  // 实际 perlerColors 数组长度
{ id: 'hama', colorCount: 48, ... },    // 实际 hamaColors 数组长度
```

## 验证

修改后，CreatePage 和 EditorPage 显示的颜色数量一致：
- Artkal: 60 色
- Perler: 60 色
- Hama: 48 色

## 备注

如果后续需要添加更多颜色，需同时更新：
1. 对应的颜色数组 (perlerColors/hamaColors/artkalColors)
2. beadBrands 中对应的 colorCount 值
