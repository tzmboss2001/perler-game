package payment

import (
	"errors"
	"net/http"
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/response"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PaymentApi struct{}

// CreateOrder 创建订单（数据库持久化）
func (p *PaymentApi) CreateOrder(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}
	userID := userIDValue.(uint)

	type createOrderReq struct {
		ProductID string `json:"product_id" binding:"required"`
		AmountFen int64  `json:"amount_fen" binding:"required,gt=0"`
		Channel   string `json:"channel"`
	}
	var req createOrderReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}
	if req.Channel == "" {
		req.Channel = "wechat"
	}

	orderID := "PB" + strconv.FormatInt(time.Now().UnixNano(), 10)
	order := entity.PaymentOrder{
		OrderID:   orderID,
		UserID:    userID,
		ProductID: req.ProductID,
		AmountFen: req.AmountFen,
		Status:    "pending",
		Channel:   req.Channel,
	}

	if err := global.GVA_DB.Create(&order).Error; err != nil {
		response.FailWithMessage("创建订单失败", c)
		return
	}

	response.OkWithData(gin.H{
		"order_id": orderID,
		"status":   order.Status,
		"pay_info": gin.H{
			"channel": req.Channel,
			"mock":    true,
		},
	}, c)
}

// WechatNotify 微信支付回调（MVP：按订单号改状态）
func (p *PaymentApi) WechatNotify(c *gin.Context) {
	type wechatNotifyReq struct {
		OrderID string `json:"order_id"`
		Status  string `json:"status"`
	}
	var req wechatNotifyReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.String(http.StatusOK, "success")
		return
	}
	if req.OrderID == "" {
		c.String(http.StatusOK, "success")
		return
	}

	updates := map[string]interface{}{}
	if req.Status == "failed" {
		updates["status"] = "failed"
		updates["paid_at"] = nil
	} else {
		now := time.Now()
		updates["status"] = "paid"
		updates["paid_at"] = &now
	}
	_ = global.GVA_DB.Model(&entity.PaymentOrder{}).Where("order_id = ?", req.OrderID).Updates(updates).Error

	c.String(http.StatusOK, "success")
}

// GetOrder 获取订单状态（数据库查询）
func (p *PaymentApi) GetOrder(c *gin.Context) {
	orderID := c.Param("id")
	if orderID == "" {
		response.FailWithMessage("订单ID不能为空", c)
		return
	}

	userIDValue, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}
	userID := userIDValue.(uint)

	var order entity.PaymentOrder
	err := global.GVA_DB.Where("order_id = ? AND user_id = ?", orderID, userID).First(&order).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.FailWithMessage("订单不存在", c)
			return
		}
		response.FailWithMessage("查询订单失败", c)
		return
	}

	response.OkWithData(order, c)
}
