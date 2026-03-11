# 2026-03-07 导出广告策略调整（无免费额度 + 解锁后自动下载）

## 需求
1. 取消高级导出每日免费额度。
2. 用户看完广告后，直接继续下载，不再要求再点一次导出。

## 修改内容

### 1) 去掉免费额度逻辑
- 文件：`src/services/adService.ts`
- 调整：
  - `PremiumExportChannel` 从 `free | reward | off` 改为 `reward | off`
  - 删除本地状态中的 `premiumExportFreeUsed`
  - `getPremiumExportDecision()` 不再计算免费次数，默认 `freeRemaining = 0`
  - 仅当有 `premiumExportRewardCredits` 时允许高级导出

### 2) 广告解锁后自动续传下载
- 文件：`src/components/ExportModal.tsx`
- 调整：
  - `onNeedRewardUnlock` 支持携带 `onUnlocked` 回调
  - 当高级导出未解锁时，传入回调；广告解锁后自动再次执行 `handleExport()`

### 3) 制作页接入自动续传
- 文件：`src/pages/mobile/MakingPage.tsx`
- 调整：
  - 新增 `pendingExportAfterRewardRef` 存储解锁后的续传动作
  - 激励广告完成后先发放 credit，再立即执行续传回调
  - toast 文案改为“广告已完成，开始下载图纸”
  - 解锁文案去掉“今日免费次数”描述

## 验证
- 执行 `npm run build`：通过。

## 结果
- 现在高级导出必须先通过激励广告获取一次解锁额度。
- 看完广告后会自动触发下载，无需再手动点第二次导出。
