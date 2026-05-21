# 制作模式高亮与网格功能合并修复记录

## 背景

正式域名后续发布后，制作模式里之前已经上线过的暗场高亮、当前格双描边、5x5 辅助线、10x10 分区线和清晰网格效果消失。排查后确认这些能力曾经发布过，但没有全部进入同一个正式发布来源分支，因此后续从其他分支发布时被覆盖。

## 处理分支

- worktree: `C:\Users\tzm\.config\superpowers\worktrees\perler-beads-creator\restore-making-highlight-grid`
- branch: `release/restore-making-highlight-grid`
- 当前 HEAD: `e57d3798`

## 合并内容

- 恢复制作流程产品化提交，包含暗场高亮、当前格双描边、colorId 优先匹配、分板分页 ZIP 导出、5x5/10x10 物理板辅助线。
- 合入 adaptive grid 相关提交，包含清晰网格、屏幕空间网格覆盖层、传统模式与单板模式共用的可读网格策略。
- 合入正式域名当前来源里的拍照同步进度功能，避免恢复网格和高亮时覆盖拍照同步入口。
- 修复合并后 `visionAssistService.ts` 中中文字符串损坏导致的 Vite 编译失败。
- 修正测试契约，使 5x5 辅助线和部署脚本安全检查匹配当前实现。
- 修正分页 ZIP smoke，使它 mock 本地色板云同步接口，不再依赖本地后端登录状态。

## 验证结果

- `node --test TEST\single_board_interaction.test.mjs TEST\physical_board_guides.test.mjs TEST\physical_board_guides_visual_contract.test.mjs`: 55/55 passed
- `node --test TEST\adaptive_grid.test.mjs TEST\adaptive_grid_visual_contract.test.mjs TEST\export_modal_visual_contract.test.mjs TEST\zip_export.test.mjs`: 23/23 passed
- photo progress 相关 6 个测试文件: 28/28 passed
- `node --test TEST\deploy_frontend_ssh_security.test.mjs`: 4/4 passed
- `MAKING_SMOKE_BASE_URL=http://127.0.0.1:5188 node --test TEST\paginated_zip_download_smoke.mjs`: passed，真实下载 ZIP 包含 2 个 PNG 分页文件
- `npm run build`: passed

## 注意事项

- 本次只完成合并分支和验证，尚未推送远端，尚未发布正式域名。
- 当前正式域名仍可能是被覆盖后的旧状态，必须从 `release/restore-making-highlight-grid` 或其合并后的主分支重新发布才会恢复。
- 本地 `main` 未直接开发，保持干净。

## 回滚方式

在未合入主线前，直接删除该 worktree 或分支即可回滚。若后续已合入主线，可按合入 commit 使用：

```powershell
git revert <integration-commit>
```
