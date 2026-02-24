package request

// AchievementUnlockReq 解锁成就请求
type AchievementUnlockReq struct {
	AchievementID string `json:"achievement_id" binding:"required"`
}

// StatsUpdateReq 更新统计请求
type StatsUpdateReq struct {
	TotalCrashes          *int `json:"total_crashes"`
	CrashUndercooked      *int `json:"crash_undercooked"`
	CrashPartialMelt      *int `json:"crash_partial_melt"`
	CrashCollapse         *int `json:"crash_collapse"`
	CrashBurned           *int `json:"crash_burned"`
	CrashSticky           *int `json:"crash_sticky"`
	TotalWorks            *int `json:"total_works"`
	PerfectScores         *int `json:"perfect_scores"`
	TotalLikesReceived    *int `json:"total_likes_received"`
	TotalComments         *int `json:"total_comments"`
	RescueSuccessCount    *int `json:"rescue_success_count"`
	FastIroningCount      *int `json:"fast_ironing_count"`
	ChallengeCompleteCount *int `json:"challenge_complete_count"`
}
