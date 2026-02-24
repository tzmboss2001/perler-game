package response

import "time"

// ChallengeItem 挑战项
type ChallengeItem struct {
	ID          uint   `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Icon        string `json:"icon"`
	Difficulty  string `json:"difficulty"`
	Constraints string `json:"constraints"`
	Scoring     string `json:"scoring"`
	TemplateID  string `json:"template_id"`
	BoardWidth  int    `json:"board_width"`
	BoardHeight int    `json:"board_height"`
}

// UserChallengeRecord 用户挑战记录
type UserChallengeRecord struct {
	ID            uint      `json:"id"`
	ChallengeCode string    `json:"challenge_code"`
	ChallengeName string    `json:"challenge_name"`
	Passed        bool      `json:"passed"`
	Score         int       `json:"score"`
	TimeUsed      float64   `json:"time_used"`
	CreatedAt     time.Time `json:"created_at"`
}

// LeaderboardEntry 排行榜条目
type LeaderboardEntry struct {
	Rank           int    `json:"rank"`
	UserID         uint   `json:"user_id"`
	UserNickname   string `json:"user_nickname"`
	UserAvatar     string `json:"user_avatar"`
	Score          int    `json:"score"`
	TimeUsed       float64 `json:"time_used"`
}
