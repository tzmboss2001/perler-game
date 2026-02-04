# 色板数据准确性更新

## 日期
2026-01-23

## 问题描述
用户反馈色板数据可能不准确，询问各品牌实际颜色数量。

## 调查结果
通过网络搜索验证，确认了官方色板数量：

| 品牌 | 原数据 | 官方实际 | 来源 |
|------|--------|----------|------|
| Perler | 60 色 | **100+ 色** | perler.com 官网 |
| Hama Midi | 68 色 | **64 色** | hama.dk 官网 |
| Artkal S-5mm | 159 色 | **225 色** | artkalfusebeads.com 官网 |

## 用户原始说法
> "hama比perler色号更细，而artkal据说是玩家级扩展，有200+颜色"

**验证结果**：用户说法基本正确
- Artkal 确实有 225 色，是最丰富的色板，适合玩家级创作
- 但 Hama Midi 实际是 64 色，不比 Perler 多

## 修改内容
更新 `src/data/beadColors.ts` 中的品牌信息：

```typescript
export const beadBrands: BeadBrand[] = [
  { id: 'perler', name: 'Perler', nameCN: 'Perler', country: '美国', colorCount: 100 },  // 官方 100+ 色
  { id: 'hama', name: 'Hama', nameCN: 'Hama', country: '丹麦', colorCount: 64 },         // 官方 Midi 64 色
  { id: 'artkal', name: 'Artkal', nameCN: 'Artkal', country: '中国', colorCount: 225 },  // 官方 S-5mm 225 色
];
```

## 后续工作
当前代码中收集的是各品牌的常用核心色（约 60 色/品牌），后续可以：
1. 从官方色卡补充更完整的 RGB 数据
2. 对于 Artkal 225 色，可以分批收集或使用爬虫从官网获取

## 备注
- 收集完整的 RGB 数据需要从官方色卡逐一提取
- 不同批次的珠子可能有轻微色差
- 实际匹配效果更依赖算法而非颜色数量
