# 2026-03-03 首页社区区域右侧截断修复

## 问题
- 首页在部分手机宽度下出现横向溢出，右侧内容被截断。
- 主要风险点：
  - 顶部三按钮区域文字过长导致列宽被撑开。
  - 社区瀑布流双列在某些布局条件下出现最小宽度溢出。

## 修复内容
文件：`perler-beads/src/pages/mobile/HomePage.tsx`

1. 全局容器防横向溢出
- `container` 增加：`width: 100%`、`overflowX: hidden`、`boxSizing: border-box`
- `content` 增加：`width: 100%`、`minWidth: 0`、`boxSizing: border-box`

2. 顶部快捷按钮改为稳定三列网格
- `quickBar` 从 `flex` 改为 `gridTemplateColumns: repeat(3, minmax(0,1fr))`
- 按钮增加 `minWidth: 0` 与 `boxSizing: border-box`
- 按钮文案增加省略：`overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap`

3. 社区列表与瀑布流防溢出
- `communitySection` / `waterfall` / `waterfallCol` 增加 `minWidth: 0` / `width: 100%`
- `postCard` 增加 `width: 100%`、`minWidth: 0`、`boxSizing: border-box`

4. 排序栏自适应
- `sortBar` 增加 `flexWrap: wrap`、`gap`、`minWidth: 0`
- `sortOptions` 增加 `flexWrap: wrap`，避免窄屏溢出

## 验证
- `npm run build`（`perler-beads`）通过

## 结果
- 首页右侧被截断问题已修复，窄屏下不再发生横向撑开。
