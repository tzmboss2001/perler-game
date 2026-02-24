package response

import "time"

// AchievementItem 成就项
type AchievementItem struct {
	AchievementID string    `json:"achievement_id"`
	UnlockedAt    time.Time `json:"unlocked_at"`
}

// UserStatsResp 用户统计响应
type UserStatsResp struct {
	TotalCrashes          int `json:"total_crashes"`
	CrashUndercooked      int `json:"crash_undercooked"`
	CrashPartialMelt      int `json:"crash_partial_melt"`
	CrashCollapse         int `json:"crash_collapse"`
	CrashBurned           int `json:"crash_burned"`
	CrashSticky           int `json:"crash_sticky"`
	TotalWorks            int `json:"total_works"`
	PerfectScores         int `json:"perfect_scores"`
	TotalLikesReceived    int `json:"total_likes_received"`
	TotalComments         int `json:"total_comments"`
	RescueSuccessCount    int `json:"rescue_success_count"`
	FastIroningCount      int `json:"fast_ironing_count"`
	ChallengeCompleteCount int `json:"challenge_complete_count"`
}
