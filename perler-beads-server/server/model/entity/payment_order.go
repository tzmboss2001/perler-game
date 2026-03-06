package entity

import "time"

// PaymentOrder 支付订单
// 状态建议：pending / paid / failed / refunded
// 支付渠道：wechat
// 备注：当前为MVP支付链路，后续可补充交易号、回调原文、验签字段等。
type PaymentOrder struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	OrderID   string     `json:"order_id" gorm:"uniqueIndex;size:64;not null"`
	UserID    uint       `json:"user_id" gorm:"index;not null"`
	ProductID string     `json:"product_id" gorm:"size:100;not null"`
	AmountFen int64      `json:"amount_fen" gorm:"not null"`
	Status    string     `json:"status" gorm:"size:20;index;not null"`
	Channel   string     `json:"channel" gorm:"size:20;not null"`
	PaidAt    *time.Time `json:"paid_at"`
}

func (PaymentOrder) TableName() string {
	return "payment_orders"
}
