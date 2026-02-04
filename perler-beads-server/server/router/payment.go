package router

import (
	v1 "perler-beads-server/api/v1/payment"

	"github.com/gin-gonic/gin"
)

// InitPaymentRouter 初始化支付路由
func InitPaymentRouter(Router *gin.RouterGroup) {
	paymentRouter := Router.Group("payment")
	paymentApi := v1.PaymentApi{}
	{
		paymentRouter.POST("create-order", paymentApi.CreateOrder)      // 创建订单
		paymentRouter.POST("wechat-notify", paymentApi.WechatNotify)    // 微信支付回调
		paymentRouter.GET("order/:id", paymentApi.GetOrder)             // 订单状态
	}
}
