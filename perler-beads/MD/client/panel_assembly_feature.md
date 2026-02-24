# 面板拼接模式（互锁卡槽系统）

## 日期
2026-02-12

## 功能概述
新增"面板拼接"构建模式，将3D模型拆解为6个面板（top/bottom/front/back/left/right），通过互锁凹凸卡槽垂直拼接。适合盒子、立方体、建筑物等规则几何体。

## 核心原理
```
板A（凹）           板B（凸）
┌──┐  ┌──┐         ┌──────┐
│  │  │  │         │      │
│  │  │  │         └┐    ┌┘
│  └──┘  │          │    │
│        │          │    │
└────────┘          └────┘

→ B的凸起插入A的凹槽，垂直卡合
```

- 共享边上交替分组：A为凹→凸→凹→凸，B为凸→凹→凸→凹
- 凹槽宽度 = 分组大小（可选2/3/4珠）
- 凹槽深度 = 2-3珠

## 新增/修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/3d/panel.ts` | 新建 | 面板拼接类型定义（PanelFace, FacePanel, EdgeConnection 等） |
| `src/services/3d/panelAssemblyService.ts` | 新建 | 核心算法：面板提取、凹凸生成、Canvas渲染 |
| `src/components/3d/PanelAssembly3DViewer.tsx` | 新建 | 3D预览：6面板按立方体位置排列 |
| `src/pages/mobile/3d/ModelTo3DPage.tsx` | 修改 | UI集成：模式选择器、面板参数、缩略图、详情弹窗、组装指南 |

## 算法详解

### 面板提取（6方向投影）
| 面     | 扫描轴 | 方向     | 面板宽 | 面板高 |
|--------|--------|----------|--------|--------|
| front  | Z      | max→min  | sizeX  | sizeY  |
| back   | Z      | min→max  | sizeX  | sizeY (镜像) |
| right  | X      | max→min  | sizeZ  | sizeY  |
| left   | X      | min→max  | sizeZ  | sizeY (镜像) |
| top    | Y      | max→min  | sizeX  | sizeZ  |
| bottom | Y      | min→max  | sizeX  | sizeZ (镜像) |

back/left 面需镜像，确保打印后翻转组装时图案朝外。

### 12条边连接映射
- 顶面4条边: top↔front, top↔back, top↔left, top↔right
- 底面4条边: bottom↔front, bottom↔back, bottom↔left, bottom↔right
- 中间4条边: front↔left, front↔right, back↔left, back↔right

### 凹凸分组
1. 边长 ÷ 分组大小 = 组数
2. Panel A: 奇数组凹、偶数组凸
3. Panel B: 互补（奇数组凸、偶数组凹）
4. 余数并入最后一组

### 建议组装顺序
底 → 后 → 左 → 右 → 前 → 顶

## UI 变化

### 新增模式选择器
- 逐层叠加（原有）
- 面板拼接（新增）

### 面板拼接参数
- 凹凸分组大小: 2/3/4珠
- 槽深度: 2/3珠

### 面板结果展示
- 6个面板缩略图（蓝色主题）
- 面板详情弹窗（支持左右滑动/箭头键导航）
- 3D拼接预览
- 组装顺序指南
- 统计信息（面板数、总珠子、边缘连接数）

## 渲染标记
- 凹槽标记：蓝色半透明 rgba(59,130,246,0.3)
- 凸起标记：琥珀色半透明 rgba(245,158,11,0.3)
- 图例显示在右下角
