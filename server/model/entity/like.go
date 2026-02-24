package entity

import (
	"time"
)

// Like 点赞模型
type Like struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `json:"user_id" gorm:"uniqueIndex:idx_user_work"`
	WorkID    uint      `json:"work_id" gorm:"uniqueIndex:idx_user_work;index"`
}

func (Like) TableName() string {
	return "likes"
}
