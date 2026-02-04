package payment

import (
	"perler-beads-server/model/response"

	"github.com/gin-gonic/gin"
)

type PaymentApi struct{}

// CreateOrder 创建订单
// @Tags     Payment
// @Summary  创建订单
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    data body object true "订单信息"
// @Success  200 {object} response.Response{data=object} "创建成功"
// @Router   /payment/create-order [post]
func (p *PaymentApi) CreateOrder(c *gin.Context) {
	// TODO: 实现创建订单逻辑
	response.OkWithMessage("创建订单接口待实现", c)
}

// WechatNotify 微信支付回调
// @Tags     Payment
// @Summary  微信支付回调
// @accept   application/xml
// @Produce  application/xml
// @Success  200 {string} string "success"
// @Router   /payment/wechat-notify [post]
func (p *PaymentApi) WechatNotify(c *gin.Context) {
	// TODO: 实现微信支付回调逻辑
	c.String(200, "success")
}

// GetOrder 获取订单状态
// @Tags     Payment
// @Summary  获取订单状态
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    id path string true "订单ID"
// @Success  200 {object} response.Response{data=object} "获取成功"
// @Router   /payment/order/{id} [get]
func (p *PaymentApi) GetOrder(c *gin.Context) {
	// TODO: 实现获取订单状态逻辑
	response.OkWithMessage("获取订单状态接口待实现", c)
}
