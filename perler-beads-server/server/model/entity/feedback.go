package entity

import (
	"time"
)

// Feedback 用户反馈模型
type Feedback struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	UserID    *uint     `json:"user_id" gorm:"index"`                           // 用户ID（可为空，未登录用户）
	Type      string    `json:"type" gorm:"size:20;default:suggestion"`         // 反馈类型: bug, suggestion, other
	Content   string    `json:"content" gorm:"type:text"`                       // 反馈内容
	Contact   string    `json:"contact" gorm:"size:100"`                        // 联系方式
	Status    int       `json:"status" gorm:"default:0;comment:0待处理1已处理2已关闭"` // 处理状态
	Reply     string    `json:"reply" gorm:"type:text"`                         // 回复内容
	RepliedAt *time.Time `json:"replied_at"`                                    // 回复时间
	IP        string    `json:"ip" gorm:"size:45"`                              // 提交IP
	UserAgent string    `json:"user_agent" gorm:"size:500"`                     // 用户代理
}

// TableName 指定表名
func (Feedback) TableName() string {
	return "feedbacks"
}
