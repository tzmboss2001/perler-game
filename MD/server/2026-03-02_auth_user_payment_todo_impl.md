# 2026-03-02 后端Auth/User/Payment待实现接口补齐

## 背景
- 抖音上线前巡检中，后端仍有多个核心接口为 TODO 返回，影响真实联调。
- 涉及模块：`auth`、`user`、`payment`。

## 本次修改
1. `server/api/v1/auth/auth.go`
- 实现 `wechat-login`：使用 `openid` 做账号映射，走 `SmartLogin` 自动注册/登录。
- 实现 `phone-login`：使用 `phone` 做账号映射，走 `SmartLogin` 自动注册/登录。
- 实现 `refresh-token`：校验 `refresh_token` 并签发新 token。
- 统一补充参数校验与错误返回。

2. `server/api/v1/user/user.go`
- 实现 `GET /user/profile`：返回当前用户基础资料。
- 实现 `PUT /user/profile`：支持更新 `nickname/avatar`。
- 实现 `GET /user/member`：返回会员等级、是否会员、到期时间与会员名称。

3. `server/api/v1/payment/payment.go`
- 实现 `POST /payment/create-order`：创建订单（MVP 内存态）。
- 实现 `POST /payment/wechat-notify`：模拟回调更新订单状态。
- 实现 `GET /payment/order/:id`：查询订单详情与状态。

## 验证
- `go build .`（目录：`perler-beads-server/server`）通过。
- `TEST/mobile_core_smoke.ps1` 通过，报告：`TEMP/mobile_core_smoke_report.md`。
- `SCRIPT/prelaunch_check.ps1` 重新执行，产出：`TEMP/prelaunch_report.md`。

## 说明
- 支付模块本次为上线前联调可用的 MVP（内存态），后续建议切换为数据库持久化订单并接入真实支付网关签名校验。
