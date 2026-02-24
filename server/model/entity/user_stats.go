package entity

import (
	"time"
)

// UserStats 用户统计数据
type UserStats struct {
	ID                    uint      `json:"id" gorm:"primaryKey"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
	UserID                uint      `json:"user_id" gorm:"uniqueIndex"`
	TotalCrashes          int       `json:"total_crashes" gorm:"default:0"`
	CrashUndercooked      int       `json:"crash_undercooked" gorm:"default:0"`
	CrashPartialMelt      int       `json:"crash_partial_melt" gorm:"default:0"`
	CrashCollapse         int       `json:"crash_collapse" gorm:"default:0"`
	CrashBurned           int       `json:"crash_burned" gorm:"default:0"`
	CrashSticky           int       `json:"crash_sticky" gorm:"default:0"`
	TotalWorks            int       `json:"total_works" gorm:"default:0"`
	PerfectScores         int       `json:"perfect_scores" gorm:"default:0"`
	TotalLikesReceived    int       `json:"total_likes_received" gorm:"default:0"`
	TotalComments         int       `json:"total_comments" gorm:"default:0"`
	RescueSuccessCount    int       `json:"rescue_success_count" gorm:"default:0"`
	FastIroningCount      int       `json:"fast_ironing_count" gorm:"default:0"`
	ChallengeCompleteCount int      `json:"challenge_complete_count" gorm:"default:0"`
}

func (UserStats) TableName() string {
	return "user_stats"
}
