package entity

import (
	"time"
)

// UserAchievement 用户成就
type UserAchievement struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	CreatedAt     time.Time `json:"created_at"`
	UserID        uint      `json:"user_id" gorm:"uniqueIndex:idx_user_achievement"`
	AchievementID string    `json:"achievement_id" gorm:"size:50;uniqueIndex:idx_user_achievement"`
}

func (UserAchievement) TableName() string {
	return "user_achievements"
}
