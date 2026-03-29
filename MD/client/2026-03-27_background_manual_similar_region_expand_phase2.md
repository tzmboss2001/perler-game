# 2026-03-27 手动扣背景相近区域扩张增强第二轮

## 问题
- 对蓝天这类渐变背景，手动点击后只会选中极少量格子，效率不足。
- 真实测试里连续点击两次也只从 1 格累加到 8 格，离产品要求还有差距。

## 修改
- 文件：`perler-beads/src/pages/mobile/EditorPage.tsx`
- 调整 `collectConnectedManualBgIndices()`：
  - 邻接从四方向扩张改为八方向扩张。
  - 改成两段式 flood fill：
    - 先用较严格阈值识别。
    - 如果识别结果仍然很小，则自动切到更宽松的相近色扩张。
- 新阈值：
  - 第一轮：seed 42 / average 34 / brightness 30
  - 第二轮：seed 60 / average 48 / brightness 42

## 目标
- 点到蓝天、阴影、树叶这类渐变背景时，一次带出更大一片相近背景区域。
