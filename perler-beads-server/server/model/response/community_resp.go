package response

import "time"

// CommunityPostAuthor 作者信息
type CommunityPostAuthor struct {
	ID       uint   `json:"id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// CommunityPostListItem 社区作品列表项（不含 bead_data）
type CommunityPostListItem struct {
	ID           uint                `json:"id"`
	Title        string              `json:"title"`
	Category     string              `json:"category"`
	Tags         string              `json:"tags"`
	ThumbnailURL string              `json:"thumbnail_url"`
	PreviewURL   string              `json:"preview_url"`
	GridWidth    int                 `json:"grid_width"`
	GridHeight   int                 `json:"grid_height"`
	ColorCount   int                 `json:"color_count"`
	Difficulty   string              `json:"difficulty"`
	PaletteBrand string              `json:"palette_brand"`
	PaletteVer   string              `json:"palette_version"`
	PaletteName  string              `json:"palette_name"`
	LikeCount    int                 `json:"like_count"`
	ViewCount    int                 `json:"view_count"`
	MakeCount    int                 `json:"make_count"`
	ReviewStatus int                 `json:"review_status"`
	ReviewReason string              `json:"review_reason"`
	User         CommunityPostAuthor `json:"user"`
	CreatedAt    time.Time           `json:"created_at"`
}

// CommunityPostDetail 社区作品详情（含 bead_data）
type CommunityPostDetail struct {
	ID           uint                   `json:"id"`
	Title        string                 `json:"title"`
	Category     string                 `json:"category"`
	Tags         string                 `json:"tags"`
	Description  string                 `json:"description"`
	ThumbnailURL string                 `json:"thumbnail_url"`
	PreviewURL   string                 `json:"preview_url"`
	ImageURLs    []string               `json:"image_urls"`
	BeadData     map[string]interface{} `json:"bead_data"`
	GridWidth    int                    `json:"grid_width"`
	GridHeight   int                    `json:"grid_height"`
	BeadCount    int                    `json:"bead_count"`
	ColorCount   int                    `json:"color_count"`
	Difficulty   string                 `json:"difficulty"`
	PaletteBrand string                 `json:"palette_brand"`
	PaletteVer   string                 `json:"palette_version"`
	PaletteName  string                 `json:"palette_name"`
	LikeCount    int                    `json:"like_count"`
	ViewCount    int                    `json:"view_count"`
	MakeCount    int                    `json:"make_count"`
	ReviewStatus int                    `json:"review_status"`
	ReviewReason string                 `json:"review_reason"`
	Liked        bool                   `json:"liked"`
	User         CommunityPostAuthor    `json:"user"`
	CreatedAt    time.Time              `json:"created_at"`
}

// LikeResponse 点赞响应
type LikeResponse struct {
	Liked     bool `json:"liked"`
	LikeCount int  `json:"like_count"`
}

// CommunityReviewLogItem 审核日志条目
type CommunityReviewLogItem struct {
	ID               uint      `json:"id"`
	PostID           uint      `json:"post_id"`
	PostTitle        string    `json:"post_title"`
	ReviewerID       uint      `json:"reviewer_id"`
	ReviewerNickname string    `json:"reviewer_nickname"`
	Action           string    `json:"action"`
	FromReviewStatus int       `json:"from_review_status"`
	ToReviewStatus   int       `json:"to_review_status"`
	Reason           string    `json:"reason"`
	CreatedAt        time.Time `json:"created_at"`
}

// CommunityReportItem 举报列表条目
type CommunityReportItem struct {
	ID               uint      `json:"id"`
	PostID           uint      `json:"post_id"`
	PostTitle        string    `json:"post_title"`
	PostUserID       uint      `json:"post_user_id"`
	ReporterID       uint      `json:"reporter_id"`
	ReporterNickname string    `json:"reporter_nickname"`
	Reason           string    `json:"reason"`
	Detail           string    `json:"detail"`
	EvidenceURLs     []string  `json:"evidence_urls"`
	Priority         int       `json:"priority"`
	RiskReason       string    `json:"risk_reason"`
	Overdue          bool      `json:"overdue"`
	AgeHours         int64     `json:"age_hours"`
	Status           int       `json:"status"`
	HandleNote       string    `json:"handle_note"`
	HandledBy        uint      `json:"handled_by"`
	HandledByName    string    `json:"handled_by_name"`
	HandledAt        time.Time `json:"handled_at"`
	CreatedAt        time.Time `json:"created_at"`
}
