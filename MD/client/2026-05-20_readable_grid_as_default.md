# 2026-05-20 清晰网格默认化

## 背景

真机测试确认网格线是用户数格子的核心参照，不应作为隐藏在工具里的增强能力。清晰网格更符合制作页的常规设计目标。

## 修改内容

- 制作页默认启用清晰网格。
- 原“网格增强”入口改为清晰网格/轻网格切换。
- 单板模式工具第一层保留网格切换入口，当前为清晰网格时按钮显示“清晰”，关闭后显示“轻网格”。
- 传统模式和桌面侧栏中的设置文案同步调整为“清晰网格 / 轻网格”。

## 影响范围

- 影响制作页 Canvas 网格默认视觉表现。
- 不影响后端、接口、图纸数据、换色、自动跳下一板、完成状态和分板导出。

## 验证

- `node --test TEST\adaptive_grid_visual_contract.test.mjs`
- `node --test TEST\adaptive_grid.test.mjs`
- `node --test TEST\single_board_interaction.test.mjs`

## 回滚方式

- 将 `gridEnhanceEnabled` 的初始值恢复为 `false`。
- 将 UI 文案恢复为“网格增强”。
