# 社区审核日志落库（Phase A）

日期：2026-03-02

## 改动
1. 新增实体：`community_review_logs`
   - 文件：`server/model/entity/community_review_log.go`
   - 字段：post_id、reviewer_id、action、from_review_status、to_review_status、reason、snapshot_title。
2. 迁移接入：`server/initialize/gorm.go`
3. 审核动作改为事务写入：`server/service/community.go`
   - 更新 `community_posts` 状态
   - 同步写入 `community_review_logs`

## 验证
- `go build .` 通过。

## 价值
- 审核操作可审计可追溯，满足上线前治理基础要求。
