package response

import "time"

// GalleryItem 广场作品项
type GalleryItem struct {
	ID           uint      `json:"id"`
	Title        string    `json:"title"`
	Thumbnail    string    `json:"thumbnail"`
	BeadCount    int       `json:"bead_count"`
	BoardWidth   int       `json:"board_width"`
	BoardHeight  int       `json:"board_height"`
	IroningScore int       `json:"ironing_score"`
	FailureType  string    `json:"failure_type"`
	RiskScore    float64   `json:"risk_score"`
	ViewCount    int       `json:"view_count"`
	LikeCount    int       `json:"like_count"`
	CommentCount int       `json:"comment_count"`
	CreatedAt    time.Time `json:"created_at"`
	// 作者信息
	AuthorID       uint   `json:"author_id"`
	AuthorNickname string `json:"author_nickname"`
	AuthorAvatar   string `json:"author_avatar"`
}

// GalleryDetail 广场作品详情
type GalleryDetail struct {
	GalleryItem
	BoardJSON string `json:"board_json"`
	IsLiked   bool   `json:"is_liked"` // 当前用户是否已点赞
}

// CommentItem 评论项
type CommentItem struct {
	ID             uint      `json:"id"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"created_at"`
	UserID         uint      `json:"user_id"`
	UserNickname   string    `json:"user_nickname"`
	UserAvatar     string    `json:"user_avatar"`
}

// LeaderboardItem 排行榜项
type LeaderboardItem struct {
	Rank           int     `json:"rank"`
	WorkID         uint    `json:"work_id"`
	Title          string  `json:"title"`
	Thumbnail      string  `json:"thumbnail"`
	FailureType    string  `json:"failure_type"`
	RiskScore      float64 `json:"risk_score"`
	IroningScore   int     `json:"ironing_score"`
	AuthorNickname string  `json:"author_nickname"`
	AuthorAvatar   string  `json:"author_avatar"`
}
