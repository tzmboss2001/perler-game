# 色温惩罚优化 - 修复暖色调图片失真问题

## 日期
2026-01-27

## 问题描述
用户上传暖色调的图片（如奶油色背景的小狗），生成的拼豆图案出现严重色偏：
- 奶油色/米色背景 → 变成浅蓝色
- 金黄色毛发 → 变成棕色/铁锈色
- 整体图片从暖色调变成冷色调

## 问题分析
原有的颜色匹配算法使用 Lab 色彩空间计算距离（Delta E），但 Lab 空间不直接考虑色温。

当两个颜色在 Lab 空间距离相近时，可能一个是暖色（米色）一个是冷色（浅蓝），算法会错误地选择冷色。

例如：
- 奶油色 RGB(255, 248, 235) - 暖色
- 浅蓝色 RGB(230, 240, 255) - 冷色
- 在 Lab 空间中距离可能非常接近，但人眼感知差异明显

## 解决方案

### 新增色温判断函数

```typescript
/**
 * 获取颜色的色温值（正值=暖，负值=冷）
 */
const getColorWarmth = (rgb: [number, number, number]): number => {
  const [r, g, b] = rgb;
  // 计算色温：(红-蓝) + (绿-蓝)*0.5
  // 正值表示暖色，负值表示冷色
  return (r - b) / 255 + (g - b) / 510;
};
```

### 颜色匹配中添加色温惩罚

```typescript
// 色温匹配惩罚：暖色匹配到冷色会有额外惩罚
const colorWarmth = getColorWarmth(color.rgb);
let warmthPenalty = 0;
if (targetWarmth > 0.05 && colorWarmth < -0.05) {
  // 暖色匹配到冷色：强惩罚
  warmthPenalty = Math.abs(warmthDiff) * 60;
} else if (targetWarmth < -0.05 && colorWarmth > 0.05) {
  // 冷色匹配到暖色：轻微惩罚
  warmthPenalty = Math.abs(warmthDiff) * 30;
}

const score = distance + saturationPenalty + warmthPenalty + vibrancyBonus;
```

### 缓存键更新
为确保新算法生效，缓存键前缀更新为 `v2:`：
```typescript
const cacheKey = `v2:${rgb[0]},${rgb[1]},${rgb[2]},${colors.length},${vibrancyWeight.toFixed(2)}`;
```

## 惩罚权重设计

| 场景 | 权重 | 原因 |
|------|------|------|
| 暖色 → 冷色 | 60 | 人眼对暖色变冷更敏感，需要强惩罚 |
| 冷色 → 暖色 | 30 | 相对可以接受，惩罚较轻 |

## 色温阈值

- `targetWarmth > 0.05`：源色明确是暖色
- `colorWarmth < -0.05`：目标色明确是冷色
- 阈值 0.05 避免中性色被误判

## 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `src/services/colorMatchService.ts` | 新增 `getColorWarmth()` 函数，在 `findClosestBeadColorLabWithVibrancy()` 中添加色温惩罚 |

## 效果对比

### 修复前
- 奶油色背景 → 浅蓝色
- 整体色调偏冷

### 修复后
- 奶油色背景 → 米黄色/奶油色
- 整体色调保持原图的温暖感

## 测试结果

| 测试场景 | 预期 | 实际 |
|----------|------|------|
| 暖色调图片（小狗） | 保持暖色调 | ✅ 通过 |
| 冷色调图片 | 不受影响 | 待测试 |
| 中性色图片 | 不受影响 | 待测试 |
