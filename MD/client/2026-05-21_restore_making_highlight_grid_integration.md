# 制作模式高亮与辅助线防覆盖集成

## 问题

正式域名后续发布后，之前已经上线过的制作模式暗场高亮、当前点击格双描边、5x5/10x10 辅助线和清晰网格能力消失。排查后确认：这些能力虽然曾发布到正式域名，但没有进入 `main` 或当前正式发布来源分支，后续从其它分支发布时被覆盖。

## 根因

- 高亮、分板导出和物理板辅助线在本地提交 `e4e378b2`，仅存在于 `feature/making-workflow-productization-phase1`。
- adaptive grid 已提交到本地 `feature/adaptive-grid-phase1`，但未进入 `main`。
- 最新正式域名包含 `origin/feature/photo-progress-phase1a` 的拍照同步能力，不在 `main` 中。
- 单独从任一分支发布都会覆盖另一边的制作页能力。

## 处理

新建集成分支：

```text
release/restore-making-highlight-grid
```

已合入：

- `e4e378b2`：制作体验产品化，包含暗场高亮、当前格双描边、5x5/10x10 辅助线、分板导出。
- `feature/adaptive-grid-phase1` 已提交内容：adaptive grid 设计、实现与发布记录。
- adaptive grid 工作区未提交内容：清晰网格默认、屏幕空间网格覆盖层、发布脚本安全密码入口。
- `origin/feature/photo-progress-phase1a`：拍照同步进度和移除旧视觉辅助入口。

## 验证重点

- 正式站后续从集成分支发布时，应同时具备：
  - 暗场聚光高亮
  - 当前点击格双描边
  - 5x5/10x10 辅助线
  - 清晰网格与屏幕空间网格
  - 拍照同步入口
  - 分板导出

## 回滚

未推送前可删除集成 worktree 和分支；已合入主线后使用：

```powershell
git revert <merge-or-integration-commit>
```
