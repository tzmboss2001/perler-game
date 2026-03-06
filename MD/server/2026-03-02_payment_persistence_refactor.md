# 2026-03-02 支付订单从内存态改为数据库持久化

## 背景
- 原实现使用进程内 `map` 保存订单，服务重启后订单丢失，属于上线硬伤。

## 修改内容
1. 新增支付订单实体
- 文件：`server/model/entity/payment_order.go`
- 表名：`payment_orders`
- 字段：`order_id`、`user_id`、`product_id`、`amount_fen`、`status`、`channel`、`paid_at` 等。

2. 纳入自动迁移
- 文件：`server/initialize/gorm.go`
- `AutoMigrate` 新增 `&entity.PaymentOrder{}`。

3. 支付API改造为落库
- 文件：`server/api/v1/payment/payment.go`
- `create-order`：写入 MySQL，初始状态 `pending`。
- `wechat-notify`：按 `order_id` 更新状态为 `paid/failed`。
- `order/:id`：按 `order_id + user_id` 查询订单。

## 验证
- `go build .`（目录：`perler-beads-server/server`）通过。
- 支付链路实测：`create-order -> get-order -> wechat-notify -> get-order`
  - 状态从 `pending` 变为 `paid`。
- `TEST/mobile_core_smoke.ps1` 通过。

## 风险与后续
- 当前回调仍是MVP，不含真实微信验签。
- 下一步建议：接入真实支付回调验签、交易号、幂等保护、退款状态机。
