package entity

import "time"

// FinishedWorkComment 成品评论
type FinishedWorkComment struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	WorkID    uint      `json:"work_id" gorm:"index;not null"`
	UserID    uint      `json:"user_id" gorm:"index;not null"`
	Content   string    `json:"content" gorm:"size:300;not null"`
	Status    int       `json:"status" gorm:"default:1;comment:0隐藏1展示"`
}

func (FinishedWorkComment) TableName() string {
	return "finished_work_comments"
}
