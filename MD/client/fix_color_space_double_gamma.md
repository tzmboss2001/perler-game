# 修复纹理采样色彩空间 + UV坐标翻转问题

## 日期: 2026-02-12

## 问题描述

体素化后的3D模型颜色与原始模型不匹配，存在两个独立问题：

### 问题1：颜色偏亮（双重伽马）
- 牛油果种子应为**深棕色**，但显示为**浅米色/淡棕色**
- 绿色外皮颜色偏亮（但视觉上可接受，所以之前未发现问题）

### 问题2：纹理采样位置偏移（flipY 错误）
- 果核的棕色区域从中央**向下偏移**到果实底部
- 真正果核位置显示为黄绿色果肉颜色
- 颜色正确但位置错误

---

## 根本原因 1：双重伽马转换

### Three.js r182 色彩空间管理

Three.js r152+ 默认启用 `ColorManagement.enabled = true`：
- `new THREE.Color(r, g, b)` → 将输入视为 **LINEAR** 值存储
- `getHexString()` → 执行 **linear→sRGB** 转换（gamma 1/2.2）

### 双重伽马转换链

```
Canvas getImageData() → sRGB 像素值 (如 R=154, G=59, B=16 = #9A3B10)
                ↓
new THREE.Color(154/255, 59/255, 16/255)
  → 错误地将 sRGB 值当作 LINEAR 存储
                ↓
getHexString() 执行 linear→sRGB 转换
  → pow(0.604, 1/2.2) = 0.798 → R=204 = 0xCC
  → 输出 #CC8447 (浅米色！应该是 #9A3B10 深棕色)
```

### 实测验证（浏览器中运行）

```javascript
// Three.js r182, ColorManagement.enabled = true
new THREE.Color(0.5, 0.5, 0.5).getHexString() → '#bcbcbc' (不是 #808080!)
// 证明 getHexString() 确实做了 linear→sRGB 转换

// 棕色双重伽马:
new THREE.Color(0.604, 0.231, 0.063).getHexString() → '#cc8447' (浅米色)

// 正确方式:
color.setRGB(0.604, 0.231, 0.063, THREE.SRGBColorSpace)
→ getHexString() → '#9a3b10' (深棕色 ✓)

// Hex round-trip 完美:
new THREE.Color('#9a3b10').getHexString() → '#9a3b10' ✓
```

---

## 根本原因 2：GLTF 纹理 flipY 导致 UV 垂直翻转

### GLTF vs 标准纹理的 flipY 差异

| 属性 | 标准纹理 (flipY=true) | GLTF纹理 (flipY=false) |
|------|----------------------|----------------------|
| UV原点 | 左下角 (OpenGL惯例) | 左上角 (GLTF规范) |
| v=0 | 图片底部 | 图片顶部 |
| v=1 | 图片顶部 | 图片底部 |
| GPU上传 | 翻转行顺序 | 不翻转 |

### 错误的 UV→像素映射

```typescript
// 旧代码（只考虑标准纹理）:
const py = Math.floor((1 - v) * (imageData.height - 1));
// 对 GLTF 纹理：v=0 应该映射到 py=0(顶部)，但实际映射到 py=height-1(底部)
// → 纹理垂直翻转 → 种子颜色从中央偏移到底部
```

### Canvas 像素坐标 vs UV 坐标

```
Canvas getImageData:
  y=0 → 图片文件顶部（第一行像素）
  y=height-1 → 图片文件底部

标准纹理 (flipY=true):
  v=0 → 底部 → py = (1-0) * height = height (底部) ✓

GLTF纹理 (flipY=false):
  v=0 → 顶部 → py = 0 * height = 0 (顶部) ✓
  需要: py = v * height（不做 1-v 翻转）
```

---

## 修复方案

### 修复1：sampleTextureAtUV() 色彩空间修正

```typescript
// 修复前（双重伽马）:
return new THREE.Color(r / 255, g / 255, b / 255);

// 修复后（正确色彩空间声明）:
const color = new THREE.Color();
color.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
return color;
```

### 修复2：sampleTextureAtUV() flipY 感知 + UV 变换

```typescript
// 修复前（硬编码 1-v，忽略 flipY 和 UV 变换）:
let u = uv.x % 1;
let v = uv.y % 1;
const py = Math.floor((1 - v) * (imageData.height - 1));

// 修复后（完整处理）:
// 1. 应用纹理 UV 变换（处理 offset, repeat, rotation）
texture.updateMatrix();
const transformedUV = uv.clone();
transformedUV.applyMatrix3(texture.matrix);

let u = transformedUV.x % 1;
let v = transformedUV.y % 1;

// 2. 根据 flipY 选择正确的垂直映射
const py = texture.flipY
  ? Math.floor((1 - v) * (imageData.height - 1))  // 标准纹理
  : Math.floor(v * (imageData.height - 1));         // GLTF纹理
```

### 修复3：VoxelViewer + StackedLayerViewer 灯光增强

```typescript
// 修复前
AmbientLight(0xffffff, 0.6)
DirectionalLight(0xffffff, 0.8)
DirectionalLight(0xffffff, 0.3)

// 修复后
AmbientLight(0xffffff, 1.2)   // 增强环境光
DirectionalLight(0xffffff, 1.0) // 增强主光
DirectionalLight(0xffffff, 0.5) // 增强副光
DirectionalLight(0xffffff, 0.3) // 新增底部补光
```

---

## 修改文件

| 文件 | 修改 |
|------|------|
| `modelVoxelizeService.ts` | `sampleTextureAtUV()`: SRGBColorSpace + flipY感知 + UV变换 |
| `VoxelViewer.tsx` | 增强灯光补偿正确 albedo |
| `StackedLayerViewer.tsx` | 同上 |

## 验证结果

### Avocado.glb 颜色对比

| 区域 | 修复前 hex | 修复后 hex | 视觉效果 |
|------|-----------|-----------|---------|
| 外皮(绿) | #7ea04d (亮绿) | #355a13 (深绿) | 3D渲染后亮度相近 |
| 种子(棕) | #cc8447 (浅米色) | #7b3c17 (深棕色) | **从米色→棕色** ✓ |
| 果肉(黄绿) | #e2c285 (米黄) | 正确的浅黄绿 | 颜色层次更分明 |

### 关键改进
- 种子棕色从不可识别（#CC8447 浅米色）变为清晰可辨（#7B3C17 深棕）
- **种子位置从底部偏移恢复到正确的中央位置**
- 颜色区分度大幅提升：外皮/果肉/种子三层颜色清晰分离
- 3D体素预览与原始模型的颜色和位置匹配度显著改善
- 支持带 KHR_texture_transform 扩展的 GLTF 模型（offset/repeat/rotation）
