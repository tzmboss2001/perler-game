# 2026-03-05 历史脏标题展示兜底修复

## 问题
- MCP 回归首页社区流时，发现个别历史数据标题显示为 `????` 等问号串，影响线上观感。
- 该问题来源于历史脏数据，前端直接展示原始标题会放大问题。

## 处理
- 新增：`perler-beads/src/utils/textUtils.ts`
  - `sanitizeDisplayText`：去除替换字符并清理空白。
  - `sanitizeDisplayTitle`：当标题为空或问号占比异常时回退为 `未命名作品`。
- 接入页面：
  - `perler-beads/src/pages/mobile/HomePage.tsx`
  - `perler-beads/src/pages/mobile/CommunityPage.tsx`
  - `perler-beads/src/pages/mobile/CommunityDetailPage.tsx`
  - `perler-beads/src/pages/mobile/FinishedWorksPage.tsx`

## 效果
- 即便后端存量数据有脏标题，前端也会显示为稳定可读文案，不再出现大段 `????`。

## 验证
- `npm.cmd run build` 构建通过。
- MCP 打开 `/mobile/home`、`/mobile/community/11`、`/mobile/login`，页面正常渲染，无黑屏。
- 控制台未再出现本轮新增错误。
