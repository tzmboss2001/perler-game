# 颜色鲜艳度优化

## 问题描述
用户反馈：与 pixelbeads 网站对比，我们的应用生成的拼豆图颜色偏暗、偏灰，不够鲜艳。

## 原因分析

| 方面 | 原实现 | pixelbeads 可能的实现 |
|------|--------|----------------------|
| 颜色匹配算法 | RGB 欧氏距离 | Lab 色彩空间 |
| 饱和度处理 | 无 | 可能有饱和度增强 |
| 颜色选择偏好 | 纯距离匹配 | 偏向选择饱和度高的颜色 |

### 为什么 RGB 欧氏距离不够好？
- RGB 空间不是感知均匀的
- 人眼对不同颜色通道的敏感度不同（绿色 > 红色 > 蓝色）
- 两个在 RGB 空间距离相近的颜色，人眼可能感知差异很大

### Lab 色彩空间的优势
- 专门设计来模拟人眼感知
- L（亮度）、a（红-绿）、b（黄-蓝）三个维度独立
- 色差计算更符合人类视觉感受

## 解决方案

### 1. 修改 `colorMatchService.ts`

新增选项：
```typescript
export interface ColorMatchOptions {
  // ... 原有选项
  saturationBoost?: number;      // 饱和度增强 0-100
  useLabSpace?: boolean;         // 使用 Lab 色彩空间
  vibrancyPreference?: number;   // 鲜艳度偏好 0-100
}
```

新增函数：
- `rgbToHsl` / `hslToRgb`: HSL 色彩空间转换
- `getColorSaturation`: 计算颜色饱和度
- `boostSaturation`: 饱和度增强
- `findClosestBeadColorLabWithVibrancy`: 带鲜艳度偏好的 Lab 颜色匹配

### 2. 修改 `EditorPage.tsx`

新增状态：
```typescript
const [saturationBoost, setSaturationBoost] = useState(30);
const [vibrancyPreference, setVibrancyPreference] = useState(40);
```

新增 UI：鲜艳度滑块控制（0-80%）

### 3. 算法改进

```typescript
// 1. 饱和度增强：提升原图颜色的饱和度
if (saturationBoost > 0) {
  processedRgb = boostSaturation(rgb, saturationBoost / 100);
}

// 2. Lab 颜色匹配 + 鲜艳度偏好
// 在距离相近的颜色中，偏向选择饱和度更高的
const score = labDistance + saturationBonus;
```

## 效果对比

| 指标 | 修改前 | 修改后 |
|------|--------|--------|
| 颜色匹配 | RGB 欧氏距离 | Lab Delta E |
| 饱和度处理 | 无 | 可调 0-80% |
| 鲜艳度偏好 | 无 | 默认 40% |
| 整体效果 | 偏暗偏灰 | 鲜艳明亮 |

## 默认参数

- 鲜艳度增强（saturationBoost）：30%
- 鲜艳度偏好（vibrancyPreference）：40%
- 使用 Lab 色彩空间：true

## 用户可调节

在编辑页面的控制面板中，添加了"鲜艳度"滑块：
- 向左滑动（0%）：保持原色
- 向右滑动（80%）：最大鲜艳度增强

## 修改文件

1. `src/services/colorMatchService.ts` - 颜色匹配算法优化
2. `src/pages/mobile/EditorPage.tsx` - 添加鲜艳度控制

## 日期
2026-01-24
