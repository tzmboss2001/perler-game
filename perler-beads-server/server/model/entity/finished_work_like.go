package entity

import "time"

// FinishedWorkLike 成品点赞
type FinishedWorkLike struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `json:"user_id" gorm:"uniqueIndex:idx_user_work_like;not null"`
	WorkID    uint      `json:"work_id" gorm:"uniqueIndex:idx_user_work_like;not null;index"`
}

func (FinishedWorkLike) TableName() string {
	return "finished_work_likes"
}
