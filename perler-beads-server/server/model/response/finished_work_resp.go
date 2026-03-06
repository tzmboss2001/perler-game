package response

import "time"

// FinishedWorkAuthor 成品作者信息
type FinishedWorkAuthor struct {
	ID       uint   `json:"id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// FinishedWorkItem 成品相册条目
type FinishedWorkItem struct {
	ID           uint                `json:"id"`
	Title        string              `json:"title"`
	Description  string              `json:"description"`
	CoverURL     string              `json:"cover_url"`
	ImageURLs    []string            `json:"image_urls"`
	ImageCount   int                 `json:"image_count"`
	Status       int                 `json:"status"`
	IsPublic     bool                `json:"is_public"`
	ReviewStatus int                 `json:"review_status"`
	ReviewReason string              `json:"review_reason"`
	LikeCount    int                 `json:"like_count"`
	CommentCount int                 `json:"comment_count"`
	Liked        bool                `json:"liked"`
	User         *FinishedWorkAuthor `json:"user,omitempty"`
	CreatedAt    time.Time           `json:"created_at"`
}

// FinishedWorkCommentItem 成品评论
type FinishedWorkCommentItem struct {
	ID        uint               `json:"id"`
	WorkID    uint               `json:"work_id"`
	Content   string             `json:"content"`
	User      FinishedWorkAuthor `json:"user"`
	CreatedAt time.Time          `json:"created_at"`
}

// FinishedWorkReportItem 成品举报项
type FinishedWorkReportItem struct {
	ID               uint      `json:"id"`
	WorkID           uint      `json:"work_id"`
	WorkTitle        string    `json:"work_title"`
	WorkOwnerID      uint      `json:"work_owner_id"`
	ReporterID       uint      `json:"reporter_id"`
	ReporterNickname string    `json:"reporter_nickname"`
	Reason           string    `json:"reason"`
	Detail           string    `json:"detail"`
	Status           int       `json:"status"`
	HandleNote       string    `json:"handle_note"`
	HandledBy        uint      `json:"handled_by"`
	HandledByName    string    `json:"handled_by_name"`
	HandledAt        time.Time `json:"handled_at"`
	CreatedAt        time.Time `json:"created_at"`
}
