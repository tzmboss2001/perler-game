package entity

import (
	"time"
)

// UserChallenge 用户挑战记录
type UserChallenge struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	CreatedAt   time.Time `json:"created_at"`
	UserID      uint      `json:"user_id" gorm:"index"`
	ChallengeID uint      `json:"challenge_id" gorm:"index"`
	Passed      bool      `json:"passed" gorm:"default:false"`
	Score       int       `json:"score" gorm:"default:0"`
	TimeUsed    float64   `json:"time_used" gorm:"default:0"`
	BonusJSON   string    `json:"bonus_json" gorm:"type:text"`
}

func (UserChallenge) TableName() string {
	return "user_challenges"
}
