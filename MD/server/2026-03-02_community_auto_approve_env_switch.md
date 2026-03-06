# 社区发布审核策略开关（COMMUNITY_AUTO_APPROVE）

日期：2026-03-02

## 改动
- 新增发布审核策略环境变量：`COMMUNITY_AUTO_APPROVE`
  - 默认（空或 true/1/on/yes）：发布即通过（保持现状）
  - false/0/off/no：发布后进入待审（`status=0, review_status=0`）
- 文件：`server/service/community.go`

## 价值
- 开发期和上线期可切换，无需改代码：
  - 开发联调：自动通过
  - 上线审核：默认待审

## 验证
- `go build .` 通过。
