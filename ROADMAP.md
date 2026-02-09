# 云拼豆游戏 - 技术路线图总纲

> 版本: v1.0
> 创建日期: 2026-02-06
> 项目代号: perler-game

---

## 一、项目概述

### 1.1 项目定位

**云拼豆** - 一款模拟实体拼豆完整体验的数字化创作游戏。

核心理念：**失败不是惩罚，是内容**

### 1.2 核心玩法循环

```
选择模板 → 放置拼豆 → 熨烫操作 → 生成结果 → 保存/分享/再来
```

### 1.3 差异化竞争点

1. 熨烫模拟系统（温度/时间/轨迹）
2. 翻车系统（5种失败类型 + 翻车报告）
3. 游戏化体验（不是工具，是游戏）

---

## 二、技术架构

### 2.1 技术栈选型

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | React 19 + TypeScript | 与拼豆工坊一致，便于复用 |
| 构建 | Vite 6 | 快速开发体验 |
| 渲染 | Canvas 2D | 拼豆绘制 + 特效实现 |
| 状态 | Zustand | 轻量级状态管理 |
| 样式 | CSS-in-JS | 组件化样式 |
| 后端 | Go + Gin | 与拼豆工坊后端一致 |
| 数据库 | MySQL + Redis | 用户/作品/模板 |

### 2.2 项目结构

```
perler-game/
├── public/
│   └── assets/              # 静态资源
│       ├── templates/       # 模板图片
│       └── sounds/          # 音效文件
├── src/
│   ├── core/                # 核心游戏逻辑
│   │   ├── BeadBoard.ts     # 拼豆画布管理
│   │   ├── BeadPlacer.ts    # 拼豆放置逻辑
│   │   ├── IroningSystem.ts # 熨烫模拟系统
│   │   ├── FailureEngine.ts # 翻车计算引擎
│   │   └── RiskCalculator.ts # 风险值计算
│   ├── effects/             # Canvas特效
│   │   ├── MeltEffect.ts    # 融化效果
│   │   ├── BurnEffect.ts    # 烧焦效果
│   │   ├── CollapseEffect.ts # 塌陷效果
│   │   └── StickEffect.ts   # 粘连效果
│   ├── components/          # UI组件
│   │   ├── GameCanvas/      # 游戏画布组件
│   │   ├── IroningPanel/    # 熨烫控制面板
│   │   ├── ColorPalette/    # 颜色选择器
│   │   ├── ResultModal/     # 结果展示弹窗
│   │   └── ShareCard/       # 分享卡片
│   ├── pages/               # 页面
│   │   ├── HomePage.tsx     # 首页
│   │   ├── GamePage.tsx     # 游戏主页面
│   │   ├── ResultPage.tsx   # 结果页面
│   │   └── GalleryPage.tsx  # 作品广场
│   ├── data/                # 数据文件
│   │   └── beadColors.ts    # 珠子颜色（复用）
│   ├── store/               # 状态管理
│   │   ├── gameStore.ts     # 游戏状态
│   │   └── userStore.ts     # 用户状态
│   ├── services/            # 服务层
│   │   ├── api/             # API接口
│   │   └── storage/         # 本地存储
│   ├── hooks/               # 自定义Hook
│   ├── utils/               # 工具函数
│   ├── styles/              # 全局样式
│   ├── router/              # 路由配置
│   ├── App.tsx
│   └── main.tsx
├── server/                  # Go后端（后续阶段）
├── MD/                      # 开发文档
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 2.3 核心数据模型

```typescript
// 单个拼豆
interface Bead {
  x: number;           // 网格X坐标
  y: number;           // 网格Y坐标
  color: string;       // 颜色HEX
  colorId: string;     // 颜色编号
  state: BeadState;    // 状态：raw | melted | burned | collapsed
}

// 拼豆画布
interface BeadBoard {
  width: number;       // 网格宽度
  height: number;      // 网格高度
  beads: Map<string, Bead>;  // key: "x,y"
  templateId?: string; // 模板ID
}

// 熨烫参数
interface IroningParams {
  temperature: number; // 温度 1-10
  duration: number;    // 时间（秒）
  trajectory: Point[]; // 熨烫轨迹
  pressure: number;    // 压力（预留）
}

// 熨烫结果
interface IroningResult {
  success: boolean;
  riskScore: number;   // 风险值 0-100
  failureType?: FailureType;
  affectedBeads: Bead[];
  report: FailureReport;
}

// 失败类型
type FailureType =
  | 'undercooked'  // 半生不熟
  | 'partial_melt' // 局部融化
  | 'collapse'     // 整体塌陷
  | 'burned'       // 颜色烧焦
  | 'sticky';      // 粘连拉扯

// 翻车报告
interface FailureReport {
  title: string;       // 标题
  description: string; // 描述
  tips: string[];      // 改进建议
  score: number;       // 评分 0-100
  shareImage: string;  // 分享图片URL
}
```

---

## 三、开发阶段规划

### Phase 1: MVP核心功能（4周）

**目标**：完成最小可玩版本，验证核心玩法

#### Week 1-2: 拼豆画布系统

- [ ] **任务1.1** 项目初始化
  - 创建项目脚手架
  - 配置Vite + React + TypeScript
  - 搭建基础目录结构
  - 复用beadColors.ts珠子数据

- [ ] **任务1.2** BeadBoard核心类
  - 网格数据结构
  - 拼豆增删改查
  - 撤销/重做栈

- [ ] **任务1.3** GameCanvas组件
  - Canvas画布初始化
  - 网格绘制
  - 拼豆绘制（圆形带光泽）
  - 缩放/平移手势

- [ ] **任务1.4** 拼豆放置交互
  - 点击放置拼豆
  - 长按删除拼豆
  - 拖拽批量放置
  - 颜色选择器

#### Week 3: 熨烫模拟系统

- [ ] **任务2.1** IroningSystem核心
  - 熨烫参数管理
  - 风险值计算公式
  - 结果判定逻辑

- [ ] **任务2.2** 熨烫UI交互
  - 温度滑块控制
  - 时间进度条
  - 熨斗轨迹绘制
  - 熨烫动画效果

- [ ] **任务2.3** 风险计算器
  ```
  风险值 = 温度风险 × 0.4 + 时间偏差 × 0.3 + 轨迹不均 × 0.3
  ```
  - 温度风险：偏离最佳温度的程度
  - 时间偏差：过长或过短
  - 轨迹不均：覆盖率和均匀度

#### Week 4: 失败系统 + 结果展示

- [ ] **任务3.1** FailureEngine失败引擎
  - 5种失败类型判定
  - 受影响区域计算
  - 失败程度分级

- [ ] **任务3.2** 失败效果渲染
  - 半生不熟：豆子保持原样，边缘未融合
  - 局部融化：部分区域变形
  - 整体塌陷：整体缩小变形
  - 颜色烧焦：发黄/发褐滤镜
  - 粘连拉扯：豆子位移动画

- [ ] **任务3.3** 结果页面
  - 成功/失败结果展示
  - 翻车报告生成
  - 保存到本地
  - 分享图片生成

---

### Phase 2: 体验优化（3周）

**目标**：丰富游戏体验，增加可玩性

#### Week 5: 模板系统

- [ ] **任务4.1** 模板数据结构
- [ ] **任务4.2** 模板选择页面
- [ ] **任务4.3** 模板引导模式（半透明底图）
- [ ] **任务4.4** 内置基础模板（10个）

#### Week 6: 音效 + 动画强化

- [ ] **任务5.1** 音效系统
  - 放置珠子音效
  - 熨烫音效（滋滋声）
  - 成功/失败音效
- [ ] **任务5.2** 动画优化
  - 珠子放置动画
  - 熨烫过程动画
  - 结果揭晓动画

#### Week 7: 存档 + 分享

- [ ] **任务6.1** 本地存档系统
- [ ] **任务6.2** 分享卡片生成
- [ ] **任务6.3** 微信/朋友圈分享

---

### Phase 3: 社区功能（4周）

**目标**：构建用户社区，增加留存

#### Week 8-9: 后端API

- [ ] **任务7.1** 用户系统（复用拼豆工坊）
- [ ] **任务7.2** 作品存储API
- [ ] **任务7.3** 作品广场API

#### Week 10-11: 作品广场

- [ ] **任务8.1** 作品广场页面
- [ ] **任务8.2** 点赞/评论功能
- [ ] **任务8.3** 翻车排行榜

---

### Phase 4: 扩展玩法（后续）

- [ ] 翻车挑战模式（限时/限温）
- [ ] 失败抢救功能
- [ ] AI图片转模板
- [ ] 多人协作拼豆
- [ ] 成就系统

---

## 四、核心算法说明

### 4.1 风险值计算

```typescript
function calculateRisk(params: IroningParams, board: BeadBoard): number {
  const optimalTemp = 6;  // 最佳温度
  const optimalTime = 5;  // 最佳时间（秒）

  // 温度风险：偏离最佳温度
  const tempRisk = Math.abs(params.temperature - optimalTemp) / 10 * 100;

  // 时间风险：过长或过短
  const timeDiff = Math.abs(params.duration - optimalTime);
  const timeRisk = Math.min(timeDiff / optimalTime * 100, 100);

  // 轨迹风险：覆盖率和均匀度
  const coverage = calculateCoverage(params.trajectory, board);
  const uniformity = calculateUniformity(params.trajectory);
  const trajectoryRisk = (1 - coverage * 0.5 - uniformity * 0.5) * 100;

  // 综合风险值
  return tempRisk * 0.4 + timeRisk * 0.3 + trajectoryRisk * 0.3;
}
```

### 4.2 失败类型判定

```typescript
function determineFailure(risk: number, params: IroningParams): FailureType | null {
  if (risk < 20) return null; // 成功

  const { temperature, duration, trajectory } = params;

  // 半生不熟：低温或时间短
  if (temperature < 4 || duration < 2) {
    return 'undercooked';
  }

  // 局部融化：轨迹不均匀
  if (calculateUniformity(trajectory) < 0.5) {
    return 'partial_melt';
  }

  // 整体塌陷：高温 + 长时间
  if (temperature > 8 && duration > 8) {
    return 'collapse';
  }

  // 颜色烧焦：高温
  if (temperature > 8) {
    return 'burned';
  }

  // 粘连拉扯：默认
  return 'sticky';
}
```

### 4.3 失败效果渲染

```typescript
// 烧焦效果：颜色偏移
function applyBurnEffect(color: string, intensity: number): string {
  const rgb = hexToRgb(color);
  // 向黄褐色偏移
  rgb.r = Math.min(255, rgb.r + intensity * 30);
  rgb.g = Math.max(0, rgb.g - intensity * 20);
  rgb.b = Math.max(0, rgb.b - intensity * 40);
  return rgbToHex(rgb);
}

// 塌陷效果：缩放变形
function applyCollapseEffect(
  ctx: CanvasRenderingContext2D,
  board: BeadBoard,
  intensity: number
) {
  const scale = 1 - intensity * 0.3; // 最多缩小30%
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  // 绘制变形后的拼豆...
  ctx.restore();
}
```

---

## 五、可复用资源清单

### 从拼豆工坊复用

| 文件/模块 | 路径 | 复用方式 |
|----------|------|---------|
| 珠子颜色数据 | `perler-beads/src/data/beadColors.ts` | 直接复制 |
| 设计系统 | `perler-beads/src/styles/designSystem.ts` | 参考修改 |
| Toast组件 | `perler-beads/src/components/Toast/` | 直接复制 |
| 用户Store | `perler-beads/src/store/userStore.ts` | 参考修改 |
| API基础 | `perler-beads/src/services/api/` | 参考修改 |

### 需要新设计

- 游戏主画布组件
- 熨烫控制面板
- 失败效果渲染器
- 翻车报告生成器
- 游戏音效系统

---

## 六、里程碑检查点

| 里程碑 | 时间点 | 交付物 | 验收标准 |
|--------|--------|--------|---------|
| M1 | Week 2 | 拼豆画布可用 | 能放置/删除/撤销拼豆 |
| M2 | Week 3 | 熨烫系统可用 | 能执行熨烫并得到结果 |
| M3 | Week 4 | MVP完成 | 完整玩一局并分享 |
| M4 | Week 7 | 体验版完成 | 有模板/音效/动画 |
| M5 | Week 11 | 社区版完成 | 作品广场上线 |

---

## 七、风险控制

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| 特效性能问题 | 中 | 高 | 分级渲染，低端设备简化 |
| 熨烫手感不好 | 高 | 高 | 多轮迭代测试 |
| 功能膨胀 | 中 | 中 | 严格按MVP清单 |
| 翻车文案枯燥 | 低 | 中 | 准备30+条趣味文案 |

---

## 八、项目启动Checklist

- [ ] 创建 `D:\work\web\perler-game` 目录
- [ ] 初始化 Vite + React + TypeScript 项目
- [ ] 复制珠子颜色数据
- [ ] 创建基础目录结构
- [ ] 配置端口（建议：3006）
- [ ] 创建 CLAUDE.md 项目指引文件

---

## 附录：开发日志模板

每完成一个任务，在 `MD/` 目录下创建日志：

```markdown
# [日期] 任务X.X - 任务名称

## 完成内容
- ...

## 技术要点
- ...

## 遇到的问题
- ...

## 下一步
- ...
```

---

> 本文档将随项目推进持续更新
>
> 下一步：执行「项目启动Checklist」，创建项目脚手架
