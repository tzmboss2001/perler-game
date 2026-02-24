package entity

import (
	"time"
)

// Comment 评论模型
type Comment struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `json:"user_id" gorm:"index"`
	WorkID    uint      `json:"work_id" gorm:"index"`
	Content   string    `json:"content" gorm:"size:500"`
}

func (Comment) TableName() string {
	return "comments"
}
