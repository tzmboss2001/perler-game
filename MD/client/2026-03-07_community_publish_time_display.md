# 2026-03-07 社区发布时间显示修复

## 问题
1. 首页社区卡片未显示发布时间。
2. 社区详情页未显示发布时间。
3. 时间格式工具出现乱码与模板字符串损坏，导致文案异常风险。

## 处理
1. 新增时间格式化工具：`src/utils/timeUtils.ts`
   - `formatRelativeTime`：刚刚 / xx分钟前 / xx小时前 / xx天前 / 超过7天显示绝对时间。
   - `formatAbsoluteTime`：`YYYY-MM-DD HH:mm`。
2. 首页接入相对时间显示：`src/pages/mobile/HomePage.tsx`
   - 社区卡片底部增加 `post.created_at` 的相对时间。
3. 详情页接入绝对发布时间：`src/pages/mobile/CommunityDetailPage.tsx`
   - 作者信息区增加“发布于 YYYY-MM-DD HH:mm”。
   - 补充 `authorMeta`、`publishTime` 样式。
4. 修复乱码与语法损坏
   - 修复 `timeUtils.ts` 内中文乱码与模板字符串损坏问题。

## 验证
- 执行：`npm run build`
- 结果：构建通过。

## 影响范围
- 移动端首页社区卡片
- 移动端社区详情页
- 时间文案工具函数
