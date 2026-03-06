package entity

import "time"

// UserPreference 用户偏好设置（登录用户云同步）
type UserPreference struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	UserID     uint      `json:"user_id" gorm:"uniqueIndex;not null"`
	MyColorIDs JSON      `json:"my_color_ids" gorm:"type:json"`
}

func (UserPreference) TableName() string {
	return "user_preferences"
}
