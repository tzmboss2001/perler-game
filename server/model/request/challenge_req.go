package request

// ChallengeSubmitReq 提交挑战结果
type ChallengeSubmitReq struct {
	ChallengeCode string  `json:"challenge_code" binding:"required"`
	Passed        bool    `json:"passed"`
	Score         int     `json:"score"`
	TimeUsed      float64 `json:"time_used"`
	BonusJSON     string  `json:"bonus_json"`
}
