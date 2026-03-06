# 2026-03-05 抖音提审收口（广告接入就绪 + 弱网容错 + 环境核对）

## 本轮目标
- 继续完成上线前剩余 3 项：
  1) 抖音广告接入就绪
  2) 弱网/断网稳定性
  3) 提审环境核对

## 已完成改动

### 1) 广告接入就绪化
- 文件：`perler-beads/src/config/monetization.ts`
  - `AdMode` 新增 `douyin`
  - 增加抖音广告位配置：
    - `VITE_DOUYIN_REWARDED_AD_UNIT_ID`
    - `VITE_DOUYIN_BANNER_CREATE_INLINE_ID`
    - `VITE_DOUYIN_BANNER_MAKING_BOTTOM_ID`

- 文件：`perler-beads/src/services/adService.ts`
  - 新增 `playRewardedAd()`：
    - `douyin` 模式优先调用 `tt.createRewardedVideoAd`
    - 不可用时返回降级状态（`no_fill/failed`）

- 文件：`perler-beads/src/components/ads/BannerAd.tsx`
  - `douyin` 模式下展示“抖音端将展示真实横幅广告”的占位说明
  - 修复并统一中文文案

- 文件：`perler-beads/src/components/ads/RewardedUnlockModal.tsx`
  - 观看广告按钮改为调用 `adService.playRewardedAd()`
  - 无真实广告时回退本地倒计时解锁（不中断流程）
  - 修复并统一中文文案

- 文件：`perler-beads/.env.release.example`
  - 增加提审环境变量模板，便于直接填值上线

### 2) 弱网/断网稳定性提升
- 文件：
  - `perler-beads/src/services/api/communityApi.ts`
  - `perler-beads/src/services/api/finishedWorkApi.ts`
  - `perler-beads/src/services/api/userApi.ts`
- 改动：
  - 通用 request 增加 `AbortController + timeout`
  - 超时统一抛出可读错误：`请求超时，请检查网络后重试`

### 3) 提审环境核对工具
- 新增：`SCRIPT/douyin_release_env_check.ps1`
  - 自动检查提审关键变量
  - 缺失时输出 FAIL 并给出 Hint

- 新增：`TEST/mobile_weak_network_contract.ps1`
  - 自动检查核心 API 文件是否具备超时契约（AbortController + timeout message）
  - 附带真机弱网手工回归步骤

### 4) 构建稳定性修复
- 文件：`perler-beads/vite.config.ts`
- 改动：`build.emptyOutDir=false`
- 目的：避免 Windows 下 `dist/thumbnails` 被占用导致 `ENOTEMPTY` 阻断构建。

## 验证结果
- `npm run build`：PASS
- `SCRIPT/frontend_quality_gate.ps1`：PASS
- `SCRIPT/douyin_compliance_check.ps1`：PASS（19/19）
- `TEST/mobile_weak_network_contract.ps1`：PASS
- `SCRIPT/douyin_release_env_check.ps1`：当前 FAIL（符合预期）
  - 原因：当前未提供提审环境变量（`VITE_AD_MODE=douyin`、`VITE_API_BASE_URL`、抖音广告位 ID）

## 结论
- 代码层“可提审能力”已打通。
- 最后一步是你提供正式环境参数（尤其抖音广告位 ID 和生产 API 域名），即可把环境检查从 FAIL 变为 PASS。
