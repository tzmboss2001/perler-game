# 2026-04-25 桌面端制作页侧边栏与工作区压缩优化

## 背景
- 桌面宽屏浏览器下，制作模式尤其是单板模式，顶部和底部仍沿用移动端式堆叠结构。
- 这会让中间图纸工作区高度被明显挤压，用户在桌面端看到的图纸区域过小。
- 目标是把桌面宽屏下的总览、板切换和次级工具迁入右侧可折叠侧边栏，同时继续收薄主区顶部和底部，让画布高度优先。

## 本次修改

### 1. 新增桌面宽屏侧边栏布局判定
- 在 `perler-beads/src/utils/singleBoardInteraction.js` 中新增：
  - `getMakingDesktopLayoutFlags`
  - `getMakingDesktopSidebarLayout`
- 仅在 `singleBoard + 宽屏 + fine pointer` 条件下启用桌面侧边栏布局。

### 2. 制作页接入桌面侧边栏状态与持久化
- 在 `perler-beads/src/pages/mobile/MakingPage.tsx` 中新增：
  - `makingDesktopSidebarCollapsed`
  - `MAKING_DESKTOP_SIDEBAR_STORAGE_KEY`
  - pointer fine 媒体查询监听
- 支持桌面侧边栏展开/收起状态本地持久化。

### 3. 右侧可折叠侧边栏落地
- 在桌面单板模式下，为预览区增加右侧绝对定位侧边栏。
- 侧边栏支持：
  - 展开态工具面板
  - 收起态窄 rail 入口

### 4. 总览与板切换迁入侧边栏
- 右侧侧边栏承接：
  - 整图总览
  - 板块 chip 切换
  - 上一板 / 下一板
  - 未完成板入口
- 主区不再保留重复的桌面总览与板切换大块。

### 5. 常用工具迁入侧边栏
- 右侧侧边栏新增“常用工具”区，迁入：
  - 图纸
  - 视觉辅助
  - 复位视图
  - 显示色号
  - 屏幕常亮
  - 语音播报
  - 高级制作辅助
  - 自动切下一板
- 桌面单板路径下，主区顶部不再保留重复的 `图纸 / 设置 / 辅助` 次级按钮。

### 6. 主区顶部与底部继续收薄
- 桌面单板主区顶部移除了重复占高的：
  - 自动切下一板
  - 精简切换
  - 顶部复位视图
- 主区顶部保留的核心控件收敛为：
  - 模式切换
  - 当前板摘要
  - 标记本板完成
  - 缩放条
  - 完成当前板
- 桌面单板主区底部整条 `板任务 / 完成 / 上一板 / 复位视图 / 下一板` 被隐藏，避免继续占用一整条高度。

## 验证

### 自动化验证
- `cmd /c npm.cmd run build`
  - 通过
- `cmd /c node --test TEST\single_board_interaction.test.mjs`
  - 32/32 通过

### MCP 桌面端验证
- 口径：`1540 x 754`
- 页面：`http://127.0.0.1:3005/mobile/making`
- 结果：
  - 单板模式下右侧出现 `桌面工具区`
  - 侧边栏中可见 `整图总览 / 板切换 / 未完成板 / 常用工具`
  - 侧边栏中可见 `图纸 / 复位视图 / 视觉辅助 / 自动切下一板`
  - 主区顶部不再出现 `自动切下一板 / 精简切换`
  - 主区底部不再出现 `板任务 / 完成 / 上一板 / 复位视图 / 下一板`
  - 主画布可见高度约为 `557.5px`

### MCP 手机端回归
- 口径：`390 x 844 x 3, mobile, touch`
- 结果：
  - 不会误显示桌面侧边栏
  - `总览` 按钮仍可见
  - 手机端单板模式主工具条仍正常

## 评审结果
- Spec review：通过
- Code quality review：`APPROVED_WITH_NITS`
  - 非阻断提醒：
    - `MakingPage.tsx` 仍然是较大的多分支组件
    - 旧设置面板与侧边栏模式仍有耦合点，后续可继续收口

## 影响范围
- `perler-beads/src/pages/mobile/MakingPage.tsx`
- `perler-beads/src/utils/singleBoardInteraction.js`
- `TEST/single_board_interaction.test.mjs`

