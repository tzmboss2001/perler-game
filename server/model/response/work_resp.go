package response

import "time"

// WorkItem 作品列表项
type WorkItem struct {
	ID           uint      `json:"id"`
	Title        string    `json:"title"`
	Thumbnail    string    `json:"thumbnail"`
	TemplateID   string    `json:"template_id"`
	BeadCount    int       `json:"bead_count"`
	BoardWidth   int       `json:"board_width"`
	BoardHeight  int       `json:"board_height"`
	IroningScore int       `json:"ironing_score"`
	FailureType  string    `json:"failure_type"`
	RiskScore    float64   `json:"risk_score"`
	IsPublic     bool      `json:"is_public"`
	ViewCount    int       `json:"view_count"`
	LikeCount    int       `json:"like_count"`
	CommentCount int       `json:"comment_count"`
	CreatedAt    time.Time `json:"created_at"`
}

// WorkDetail 作品详情
type WorkDetail struct {
	WorkItem
	BoardJSON string `json:"board_json"`
	UserID    uint   `json:"user_id"`
}
