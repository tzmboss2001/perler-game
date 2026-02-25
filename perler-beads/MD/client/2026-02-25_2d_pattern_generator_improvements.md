# 2D 图案生成器功能改进（2026-02-25）

## 概述
按优先级实施了 P0→P1→P2 共 6 个功能点的改进。

---

## P0-1: 颜色数量选择器优化

**改动文件：**
- `src/data/beadColors.ts` - `ColorCountOption` 接口新增 `detailDesc`、`icon`、`recommended` 字段
- `src/pages/mobile/CreatePage.tsx` - 横排按钮改为 3×2 grid 卡片布局

**效果：** 每张卡片展示图标+数量+描述+用途说明+推荐标签（150色标记为推荐）

---

## P0-2: 自定义色板（我有的颜色）

**新建文件：**
- `src/services/myColorsService.ts` - localStorage 读写 + MARD 14个系列分组
- `src/components/MyColorsModal.tsx` - 色板管理弹窗（折叠展示、勾选/全选/清空）

**修改文件：**
- `src/pages/mobile/CreatePage.tsx` - 添加"只用我的颜色"开关 + 管理入口
- `src/pages/mobile/EditorPage.tsx` - 接收 `customColorIds`，生成时排除未选颜色
- `src/pages/mobile/ProfilePage.tsx` - 菜单添加"管理我的色板"入口

**存储：** `localStorage key: "perler_beads_my_colors"`

---

## P1-3: 智能合并（批量颜色替换）

**修改文件：**
- `src/services/colorMatchService.ts` - 新增 `smartMergeColors()` 函数 + `SmartMergeResult` 接口
- `src/pages/mobile/EditorPage.tsx` - 统计面板添加"合并"按钮

**新建文件：**
- `src/components/SmartMergeModal.tsx` - 合并预览弹窗（阈值滑块 + 预览列表 + 确认）

**核心逻辑：** 使用量 ≤ 阈值的颜色找最近的保留颜色合并，支持撤销（存入历史）

---

## P1-4: 图纸导出增强 - 按拼豆板分页

**修改文件：**
- `src/services/colorMatchService.ts` - 新增 `renderBeadsPaginated()` 函数
- `src/components/ExportModal.tsx` - 新增"按拼豆板分页"开关 + 板子尺寸选择（15/29/58）

**效果：** 分页模式下逐页下载，每页标注"第X/N页 行Y 列Z [坐标范围]"

---

## P1-5: 离线模式增强

**修改文件：**
- `src/pages/mobile/EditorPage.tsx` - `handleStartMakingClick` 不再检查登录，`handleSaveProject` 根据登录状态分支保存
- `src/pages/mobile/ProfilePage.tsx` - 未登录时显示本地方案列表（支持继续/删除）
- `src/components/SaveProjectModal.tsx` - 新增 `isLoggedIn` prop，底部提示保存位置

---

## P2-7: 多板拼接指引

**修改文件：**
- `src/pages/mobile/MakingPage.tsx` - Canvas 渲染函数中叠加板子边界线（每29格橙色虚线）和板号标注

**效果：** 当图案超过 29×29 时，自动显示板子边界和"板1"/"板2"编号

---

## 验证
- `npm run build` 编译通过
- 所有新增组件正确导入和使用
- 无 TypeScript 类型错误
