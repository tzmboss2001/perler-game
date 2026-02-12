# 增加深度图转3D最大层数

## 日期
2026-02-05

## 问题描述
用户反馈：对于复杂物体（如玩偶、人物），8层不足以展现真实的立体感。例如，一个向前伸出的脚与躯干之间的深度差异很大，但8层无法充分体现这种差异。

## 原因分析
1. 最大层数限制为8层，对于复杂3D物体来说层数太少
2. 深度图的灰度范围（如8-254）映射到8层，精度不够
3. 简单物体（如武器、宝剑）可能只需要少量层数，但复杂物体需要更多

## 解决方案

### 修改1：增加默认层数
将默认最大层数从8层增加到16层。

```typescript
// 修改前
const [maxLayers, setMaxLayers] = useState(8);

// 修改后
const [maxLayers, setMaxLayers] = useState(16);
```

### 修改2：扩大层数选择范围
将滑块最大值从16增加到32，允许用户选择更高的层数。

```typescript
// 修改前
<input type="range" min={4} max={16} step={1} ... />

// 修改后
<input type="range" min={4} max={32} step={2} ... />
```

### 修改3：动态调整表面厚度
表面厚度根据最大层数动态调整，保持合理的立体感。

```typescript
// 修改前
const surfaceThickness = 3; // 固定3层

// 修改后
const surfaceThickness = Math.max(2, Math.round(maxLayers * 0.2)); // 层数的20%，最少2层
```

### 厚度对照表
| 最大层数 | 表面厚度 |
|----------|----------|
| 4-9 | 2 层 |
| 10-14 | 2-3 层 |
| 15-19 | 3-4 层 |
| 20-24 | 4-5 层 |
| 25-32 | 5-6 层 |

## 修改文件
- `perler-beads/src/pages/mobile/3d/DepthTo3DPage.tsx` - 页面参数默认值和滑块范围
- `perler-beads/src/services/3d/depthTo3DService.ts` - 动态表面厚度算法

## 预期效果
1. 复杂物体（玩偶、人物等）：使用16-32层，深度变化更细腻
2. 简单物体（武器、工具等）：使用4-8层，保持简洁
3. 用户可根据物体复杂度自行调整层数
4. 表面厚度自动适配，保持立体感

## 使用建议
| 物体类型 | 建议层数 |
|----------|----------|
| 简单物体（武器、工具、几何形状） | 4-8 层 |
| 中等复杂度（水果、简单玩具） | 8-16 层 |
| 复杂物体（玩偶、人物、动物） | 16-32 层 |

---

## 追加修复：悬空问题 (2026-02-05)

### 问题描述
使用"带厚度表面渲染"模式时，模型呈现悬空状态，底部有很多柱子支撑，不够自然。

### 原因分析
- 每个像素的Z值直接映射到对应层
- 表面厚度只渲染 `(z-thickness)` 到 `z`
- 低Z区域和高Z区域之间没有连接

### 解决方案：接地浮雕模式
将算法改为"接地浮雕"模式：

```typescript
// 第一遍：找出最小Z值
let minZ = maxLayers;
for (const pixel of validPixels) {
  minZ = Math.min(minZ, pixel.z);
}

// 第二遍：归一化并实心填充
const baseThickness = Math.max(2, Math.round(maxLayers * 0.15)); // 基础厚度15%

for (const pixel of validPixels) {
  // 归一化：最低点变为baseThickness，其他点相对抬升
  const normalizedZ = (z - minZ) + baseThickness;

  // 从第1层实心填充到normalizedZ
  for (let layer = 1; layer <= normalizedZ; layer++) {
    layersMap.get(layer)!.push({ x, y, color, beadId: color });
  }
}
```

### 效果对比
| 模式 | 效果 |
|------|------|
| 原带厚度表面模式 | 悬空，底部有支撑柱 |
| **接地浮雕模式** | 接地，实心底座+浮雕起伏 |

### 算法原理
1. 扫描所有有效像素，找出最小Z值（minZ）
2. 将所有Z值归一化：`normalizedZ = (z - minZ) + baseThickness`
3. 最低的部分从第1层开始（接地）
4. 较高的部分相对抬升，形成浮雕
5. 每个像素实心填充从1层到其归一化Z值

---

## 追加修复：砖块问题 + 五官扁平问题 (2026-02-05)

### 问题描述
1. **砖块问题**：实心填充导致侧面看像一块砖，只有顶部有浮雕效果
2. **五官扁平**：面部的五官没有深度变化，完全扁平

### 解决方案

#### 1. 薄底座+表面浮雕模式
```typescript
const baseLayer = 1; // 只有1层薄底座
const surfaceThickness = Math.max(2, Math.round(maxLayers * 0.15));

for (const pixel of validPixels) {
  const normalizedZ = (z - minZ) + baseLayer + 1;

  // 1. 添加薄底座（只有1层）
  layersMap.get(baseLayer)!.push({ x, y, color, beadId: color });

  // 2. 在实际深度位置添加表面shell（不是实心填充）
  const shellStart = Math.max(baseLayer + 1, actualZ - surfaceThickness + 1);
  for (let layer = shellStart; layer <= actualZ; layer++) {
    layersMap.get(layer)!.push({ x, y, color, beadId: color });
  }
}
```

#### 2. Gamma校正增强细节对比度
```typescript
// gamma < 1 会增强细节对比度（让小的深度差异更明显）
const gamma = 0.7;
const enhanced = Math.pow(normalized, gamma);
const z = Math.round(enhanced * (maxLayers - 1)) + 1;
```

### 效果对比
| 模式 | 效果 |
|------|------|
| 实心填充模式 | 像砖块，只有顶部有浮雕 |
| **薄底座+表面浮雕** | 只有1层底座，浮雕效果明显 |

### Gamma校正原理
- gamma = 1.0：线性映射，无增强
- gamma < 1.0：增强亮部细节（让高Z值区域的差异更明显）
- gamma > 1.0：增强暗部细节（让低Z值区域的差异更明显）
- 使用 gamma = 0.7 可以让面部五官等细节的深度差异更加明显

---

## 追加修复：真正的3D浮雕算法 - 深度阈值切片法 (2026-02-05)

### 问题描述
用户发现之前的算法有根本性问题：
> "有很多个不同的Z值的方块，他们的XY值都一样，比如Z1-Z15，有15个相同XY的方格，相当于一个2D图，叠加15层，他还是个2D图，只不过是一个很厚的2D图罢了"

**核心问题**：之前的算法是在每个XY位置从第1层填充到该位置的Z值，导致所有层的轮廓相同，只是厚度不同，像一块厚砖头。

### 解决方案：深度阈值切片法

**原理**：像切球体一样，每一层只显示深度值 >= 该层阈值的像素。这样：
- 第1层（底部）：显示所有像素（完整轮廓）
- 第N层：只显示深度值较高的像素（形状变小）
- 最高层：只显示深度值最大的像素（最凸起的部分）

```typescript
// 深度阈值切片法
const layersMap = new Map<number, LayerBead[]>();
let voxelCount = 0;

// 计算深度范围
let maxZ = 1;
for (const pixel of validPixels) {
  maxZ = Math.max(maxZ, pixel.z);
}
const depthRange = maxZ - minZ;

// 计算每层的深度阈值步长
const step = depthRange / (maxLayers - 1);

for (let layer = 1; layer <= maxLayers; layer++) {
  // 这一层的深度阈值：越高的层，阈值越高
  const threshold = minZ + (layer - 1) * step;

  for (const pixel of validPixels) {
    const { x, y, z, color } = pixel;

    // 只有深度值 >= 阈值的像素才在这一层显示
    if (z >= threshold) {
      if (!layersMap.has(layer)) {
        layersMap.set(layer, []);
      }
      layersMap.get(layer)!.push({ x, y, color, beadId: color });
      voxelCount++;
    }
  }
}
```

### 效果对比
| 算法 | 侧面效果 | 层与层关系 |
|------|----------|------------|
| 旧算法（实心填充） | 像砖块，每层轮廓相同 | Z1-Z15的XY都一样 |
| **深度阈值切片法** | 真正浮雕，每层轮廓不同 | 高层只有凸起部分 |

### 类比说明
想象一个球体：
- 底层切片：大圆
- 中间切片：中等圆
- 顶层切片：小圆

深度阈值切片法就是这个原理，让每一层都有不同的形状。

### 修改文件
- `perler-beads/src/services/3d/depthTo3DService.ts` - depthToVoxels 函数

### 验证结果
测试显示侧面视角有明显的浮雕层次变化，每层形状确实不同，不再是简单的2D图叠加。
