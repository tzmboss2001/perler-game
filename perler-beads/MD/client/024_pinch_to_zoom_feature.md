# 双指缩放功能实现记录

## 日期
2025-01-26

## 功能描述
在 InteractiveCanvas 组件中添加双指缩放（Pinch-to-Zoom）功能，让移动端用户可以通过双指手势直接放大缩小图案预览。

## 用户场景
- 用户在手机上使用编辑器
- 需要放大查看细节或缩小查看整体效果
- 期望像其他图片应用一样使用双指缩放

## 实现方案

### 核心逻辑
1. 检测双指触摸事件 (`e.touches.length === 2`)
2. 计算两指间距离作为初始距离
3. 在移动时计算新距离，计算缩放比例
4. 应用缩放限制（30% - 500%）

### 代码实现

#### 状态定义
```typescript
// 双指缩放状态
const [isPinching, setIsPinching] = useState(false);
const pinchStartDistance = useRef<number>(0);
const pinchStartScale = useRef<number>(1);
const MIN_SCALE = 0.3;  // 最小缩放 30%
const MAX_SCALE = 5;    // 最大缩放 500%
```

#### 距离计算函数
```typescript
const getTouchDistance = (touches: React.TouchList): number => {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};
```

#### 触摸事件处理
```typescript
const handleTouchStart = (e: React.TouchEvent) => {
  if (e.touches.length === 1) {
    // 单指 - 正常交互
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY, true);
  } else if (e.touches.length === 2) {
    // 双指 - 开始缩放
    e.preventDefault();
    setIsDragging(false);
    setIsPinching(true);
    pinchStartDistance.current = getTouchDistance(e.touches);
    pinchStartScale.current = scale;
  }
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (e.touches.length === 1 && isDragging) {
    // 单指拖动
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  } else if (e.touches.length === 2 && isPinching) {
    // 双指缩放
    e.preventDefault();
    const currentDistance = getTouchDistance(e.touches);
    const scaleRatio = currentDistance / pinchStartDistance.current;
    let newScale = pinchStartScale.current * scaleRatio;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    setScale(newScale);
  }
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (e.touches.length < 2) {
    setIsPinching(false);
  }
  if (e.touches.length === 0) {
    handleEnd();
  }
};
```

### 缩放控制条更新
- 滑动条范围从 50%-300% 扩展到 30%-500%
- 与双指缩放使用相同的 MIN_SCALE 和 MAX_SCALE 常量

### 触摸事件处理
- 编辑模式下：`touchAction: 'none'` 阻止浏览器默认行为
- 查看模式下：`touchAction: 'pan-x pan-y'` 允许滚动
- 双指缩放通过 `e.preventDefault()` 阻止默认缩放

## 修改的文件

### InteractiveCanvas.tsx
- 添加双指缩放状态和 refs
- 添加 `getTouchDistance` 函数
- 更新 `handleTouchStart` 检测双指触摸
- 更新 `handleTouchMove` 处理缩放计算
- 更新 `handleTouchEnd` 处理缩放结束
- 更新缩放控制条使用统一的缩放范围

## 测试要点
| 场景 | 预期结果 |
|------|----------|
| 单指点击 | 正常的选择/编辑操作 |
| 单指拖动 | 正常的拖动绘制（编辑模式）|
| 双指张开 | 放大图案 |
| 双指收拢 | 缩小图案 |
| 缩放到最大 | 停止在 500% |
| 缩放到最小 | 停止在 30% |
| 缩放后单指操作 | 正常工作 |
| 使用滑动条 | 与双指缩放同步 |

## 兼容性
- iOS Safari: 支持
- Android Chrome: 支持
- 桌面 Chrome DevTools 模拟器: 支持（使用触摸模拟）
