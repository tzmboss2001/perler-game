# 2026-03-05 广告与导出文案乱码修复（发布前阻塞清理）

## 问题
- 广告相关 UI 仍有用户可见乱码：
  - 横幅广告占位文案乱码
  - 激励广告解锁弹窗乱码
  - 导出弹窗（ExportModal）大量文案乱码（分辨率、开关、按钮等）

## 修改

### 1) 横幅广告文案修复
- 文件：`perler-beads/src/components/ads/BannerAd.tsx`
- 修复内容：
  - `创作页推荐广告`
  - `制作页工具广告`
  - `广告`
  - `广告收益将用于维持免费功能`

### 2) 激励弹窗文案修复
- 文件：`perler-beads/src/components/ads/RewardedUnlockModal.tsx`
- 修复内容：
  - `看完短广告后可继续免费使用高级功能`
  - `取消`
  - `广告播放中 {seconds}s`
  - `观看广告并解锁`

### 3) 导出弹窗重构（保留导出逻辑）
- 文件：`perler-beads/src/components/ExportModal.tsx`
- 处理方式：重写文案层与界面结构，保留核心导出逻辑：
  - 单图导出：`renderBeadsToCanvas` / `renderBeadsToCanvasWithList`
  - 分页导出：`renderBeadsPaginated`
  - 广告解锁规则：继续走 `adService.getPremiumExportDecision` 与 `recordPremiumExportOpened`
- 用户可见文案恢复为可读中文（导出图案、选择分辨率、导出选项、导出图片等）。

## 验证
- 构建：`npm run build` 通过。
- 质量门禁：`SCRIPT/frontend_quality_gate.ps1` 全 PASS。
- MCP 回归：
  - `/mobile/making?test=1` 可见横幅文案正常：`广告 制作页工具广告 广告收益将用于维持免费功能`
  - 点击 `下载图纸` 后导出弹窗文本正常：
    - `导出图案`
    - `选择分辨率`
    - `导出选项`
    - `导出图片`

## 当前发布前剩余重点（真实阻塞）
1. 抖音真机广告组件与真实广告位 ID 接入（当前仍为 Web 形态占位 + 配置化模式）。
2. 真机弱网/断网回归（图片上传、社区图加载、token 过期恢复链路）。
3. 最终提审包环境核对（域名白名单、监控开关、版本冻结）。
