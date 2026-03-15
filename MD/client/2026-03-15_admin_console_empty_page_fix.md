# 运营后台空页面修复

- 日期：2026-03-15
- 范围：客户端

## 问题

复核上线阻塞项时发现，`/admin` 路由对应的 `AdminConsolePage.tsx` 是空文件。
这意味着：
- 运营后台地址存在，但页面实际不可用
- ` /mobile/community/moderation ` 重定向到 `/admin` 后无法正常承接

这属于明确的后台可用性缺陷，会影响社区治理链路和提审可验性。

## 修复

- 新建 `AdminConsolePage.tsx`
- 当前第一版直接复用 `CommunityModerationPage`
- 让 `/admin` 与 `/mobile/community/moderation -> /admin` 统一落到可用的社区审核台

## 结果

- 运营后台路由不再落空
- 社区审核与举报处理页面具备实际可访问入口
- 平台提审和内部运营验证时，后台链路完整可走通
