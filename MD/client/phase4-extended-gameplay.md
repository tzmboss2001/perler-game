# Phase 4 - 扩展玩法功能实现

## 日期：2026-02-09

## 修改概要

### 1. 失败抢救功能（Step 1）
- **新增 `GamePhase: 'rescuing'`** - `src/types/game.ts` 增加抢救阶段和相关类型
- **新增 `RescueSystem.ts`** - 抢救核心逻辑（canRescue/getRescueOption/executeRescue/applyRescueToBoard）
- **新增 `RescuePanel` 组件** - 抢救面板UI（失败图标+操作区+倒计时+完成度）
- **修改 `gameStore.ts`** - 添加 `rescueUsed` 字段，重置时清零
- **修改 `IroningPanel.tsx`** - 失败时拦截到 'rescuing' 阶段（非collapse且未用过抢救）
- **修改 `GamePage.tsx`** - 新增 `phase === 'rescuing'` 分支渲染 RescuePanel

### 2. 成就系统前端（Step 2）
- **新增 `src/data/achievements.ts`** - 15个成就定义（翻车/创作/熨烫/社交四类）
- **新增 `AchievementChecker.ts`** - 纯函数检测成就条件
- **新增 `achievementStore.ts`** - Zustand + persist + 服务器同步
- **新增 `AchievementToast` 组件** - 全局通知，顶部滑入2.5s消失
- **新增 `AchievementPage` 页面** - 分类展示/进度条/统计摘要
- **修改 `App.tsx`** - 全局挂载 AchievementToast
- **修改 `router/index.tsx`** - 添加 /achievements 路由
- **修改 `HomePage.tsx`** - 添加成就入口卡片
- **修改 `IroningPanel.tsx`** - 完成熨烫时触发成就统计

### 3. 成就系统后端（Step 3）
- **新增数据表** - `user_achievements`、`user_stats`
- **新增 API** - GET/POST achievement/my, unlock, stats, stats/update
- **新增后端文件** - entity、request、response、service、api、router
- **修改 `gorm.go`** - AutoMigrate 新增2表
- **修改 `router.go`** - 注册 achievement 路由
- **修改 `api.ts`** - 新增 achievementApi
- **修改 `achievementStore.ts`** - 对接 syncToServer/loadFromServer

### 4. 挑战模式前端（Step 4）
- **新增 `src/data/challenges.ts`** - 8个挑战定义 + 每日/每周选取
- **新增 `ChallengeScoring.ts`** - 挑战评分系统
- **新增 `challengeStore.ts`** - Zustand 挑战状态管理
- **新增 `ChallengePage` 页面** - 每日/每周挑战卡片
- **修改 `IroningPanel.tsx`** - 温度锁定+倒计时+挑战结果计算
- **修改 `ResultPage.tsx`** - 挑战模式结果展示区块
- **修改 `HomePage.tsx`** - 添加挑战模式入口
- **修改 `router/index.tsx`** - 添加 /challenge 路由
- **修改 CSS** - IroningPanel.css + ResultPage.css

### 5. 挑战模式后端（Step 5）
- **新增数据表** - `challenges`、`user_challenges`
- **新增 API** - GET daily/weekly, POST submit, GET leaderboard/:id, GET my-records
- **新增后端文件** - entity、request、response、service、api、router
- **修改 `gorm.go`** - AutoMigrate 新增2表
- **修改 `router.go`** - 注册 challenge 公开+私有路由
- **修改 `api.ts`** - 新增 challengeApi

## 文件清单

### 新建文件（~25个）
| 文件 | 类型 |
|------|------|
| src/core/RescueSystem.ts | 前端核心 |
| src/core/AchievementChecker.ts | 前端核心 |
| src/core/ChallengeScoring.ts | 前端核心 |
| src/data/achievements.ts | 前端数据 |
| src/data/challenges.ts | 前端数据 |
| src/store/achievementStore.ts | 前端Store |
| src/store/challengeStore.ts | 前端Store |
| src/components/RescuePanel/* (3文件) | 前端组件 |
| src/components/AchievementToast/* (3文件) | 前端组件 |
| src/pages/AchievementPage.tsx + CSS | 前端页面 |
| src/pages/ChallengePage.tsx + CSS | 前端页面 |
| server/model/entity/user_achievement.go | 后端实体 |
| server/model/entity/user_stats.go | 后端实体 |
| server/model/entity/challenge.go | 后端实体 |
| server/model/entity/user_challenge.go | 后端实体 |
| server/model/request/achievement_req.go | 后端请求 |
| server/model/request/challenge_req.go | 后端请求 |
| server/model/response/achievement_resp.go | 后端响应 |
| server/model/response/challenge_resp.go | 后端响应 |
| server/service/achievement.go | 后端服务 |
| server/service/challenge.go | 后端服务 |
| server/api/v1/achievement/achievement.go | 后端API |
| server/api/v1/challenge/challenge.go | 后端API |
| server/router/achievement.go | 后端路由 |
| server/router/challenge.go | 后端路由 |

### 修改文件（~12个）
| 文件 | 修改内容 |
|------|---------|
| src/types/game.ts | 增加 'rescuing' 阶段 + RescueOption/RescueResult 类型 |
| src/store/gameStore.ts | 增加 rescueUsed 字段 |
| src/components/IroningPanel/IroningPanel.tsx | 抢救拦截 + 成就统计 + 挑战约束 |
| src/components/IroningPanel/IroningPanel.css | 挑战提示栏样式 |
| src/pages/GamePage.tsx | 增加 rescuing 阶段渲染 |
| src/pages/HomePage.tsx | 增加挑战/成就入口卡片 |
| src/pages/ResultPage.tsx | 增加挑战结果展示 |
| src/pages/ResultPage.css | 挑战结果样式 |
| src/App.tsx | 全局挂载 AchievementToast |
| src/router/index.tsx | 增加 /achievements + /challenge 路由 |
| src/services/api.ts | 增加 achievementApi + challengeApi |
| server/initialize/gorm.go | AutoMigrate 4张新表 |
| server/initialize/router.go | 注册 achievement + challenge 路由 |

## TypeScript 检查：通过（0错误）

## Step 6 集成测试结果（Chrome MCP 端到端）

| 测试项 | 状态 | 说明 |
|--------|------|------|
| 首页入口卡片 | ✅ 通过 | 挑战模式🎯 + 成就🏆 入口正常显示和跳转 |
| 成就页面 | ✅ 通过 | 15个成就、4分类筛选、进度条、统计摘要全部正确 |
| 挑战页面 | ✅ 通过 | 每日3个 + 每周2个挑战，基于日期种子随机选取 |
| 挑战流程（crash_target） | ✅ 通过 | 故意烧焦挑战→熨烫→结果页显示挑战失败+评分明细 |
| 抢救面板显示 | ✅ 通过 | 熨烫失败(sticky)→RescuePanel弹出→显示抢救方案 |
| 抢救交互 | ✅ 通过 | 开始抢救→倒计时+点击计数→自动完成→结果页显示抢救结果 |
| 成就自动解锁 | ✅ 通过 | 翻车后"初次翻车"成就自动解锁 |
| 成就数据持久化 | ✅ 通过 | localStorage正确保存stats(2次翻车)和unlockedIds(first_crash) |
| 成就页数据同步 | ✅ 通过 | 已解锁1/15(7%)，翻车王进度2/10，五毒俱全1/5 |
| Go后端编译 | ✅ 通过 | go build ./... 无错误 |

### 测试截图
- `TEMP/test_rescue_panel.png` - 抢救面板UI
- `TEMP/test_rescue_result.png` - 抢救后结果页
- `TEMP/test_achievement_unlocked.png` - 成就解锁后的成就页
