# 颜色名称中文翻译

## 日期
2026-01-29

## 问题描述
用户反馈采购清单里的颜色名称是英文的，由于应用主要在国内使用，需要将颜色名称翻译成中文。

## 问题原因
数据源 `beadColors.ts` 中的 `nameCN` 字段原本存储的是英文名称，而不是中文翻译。

## 解决方案
将所有 356 种颜色的 `nameCN` 字段从英文翻译为中文。

### 翻译示例

| 品牌 | 英文名 | 中文名 |
|------|--------|--------|
| Perler | White | 白色 |
| Perler | Robin's Egg | 知更鸟蛋蓝 |
| Perler | Butterscotch | 奶油糖色 |
| Hama | Fluorescent Yellow | 荧光黄 |
| Hama | Pastel Ice Blue | 粉彩冰蓝 |
| Hama | Green (Glow in the Dark) | 夜光绿 |
| Artkal | Pistachio | 开心果绿 |
| Artkal | Butterfly Bush | 蝴蝶紫 |
| Artkal | Cornflower Blue | 矢车菊蓝 |

### 翻译规则
1. **基础颜色**: 直接翻译（White → 白色, Red → 红色）
2. **复合颜色**: 保留修饰词（Light Blue → 浅蓝色, Dark Green → 深绿色）
3. **特殊系列**:
   - Pastel 系列 → 粉彩（Pastel Blue → 粉彩蓝）
   - Neon 系列 → 荧光（Neon Yellow → 荧光黄）
   - Fluorescent 系列 → 荧光（Fluorescent Orange → 荧光橙）
   - Glow in the Dark → 夜光（Green Glow → 夜光绿）
   - Transparent 系列 → 透明（Transparent Red → 透明红）
   - Translucent 系列 → 半透明（Translucent Purple → 半透明紫）
4. **植物/自然名**: 保留意译（Lavender → 薰衣草, Coral → 珊瑚色）
5. **食物名**: 保留意译（Butterscotch → 奶油糖色, Vanilla → 香草色）

## 修改文件
- `src/data/beadColors.ts` - 356 种颜色全部翻译

## 统计
- Perler 品牌: 102 种颜色
- Hama 品牌: 80 种颜色
- Artkal C 品牌: 174 种颜色
- **总计: 356 种颜色**

## 测试结果
- 采购清单显示中文颜色名称
- 制作模式页面颜色信息正确显示
