package response

import "time"

// CommunityPostAuthor 作者信息（嵌入列表和详情中）
type CommunityPostAuthor struct {
	ID       uint   `json:"id"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}

// CommunityPostListItem 社区作品列表项（不含 bead_data）
type CommunityPostListItem struct {
	ID           uint                `json:"id"`
	Title        string              `json:"title"`
	ThumbnailURL string              `json:"thumbnail_url"`
	GridWidth    int                 `json:"grid_width"`
	GridHeight   int                 `json:"grid_height"`
	ColorCount   int                 `json:"color_count"`
	Difficulty   string              `json:"difficulty"`
	LikeCount    int                 `json:"like_count"`
	ViewCount    int                 `json:"view_count"`
	MakeCount    int                 `json:"make_count"`
	User         CommunityPostAuthor `json:"user"`
	CreatedAt    time.Time           `json:"created_at"`
}

// CommunityPostDetail 社区作品详情（含 bead_data）
type CommunityPostDetail struct {
	ID           uint                   `json:"id"`
	Title        string                 `json:"title"`
	Description  string                 `json:"description"`
	ThumbnailURL string                 `json:"thumbnail_url"`
	ImageURLs    []string               `json:"image_urls"`
	BeadData     map[string]interface{} `json:"bead_data"`
	GridWidth    int                    `json:"grid_width"`
	GridHeight   int                    `json:"grid_height"`
	BeadCount    int                    `json:"bead_count"`
	ColorCount   int                    `json:"color_count"`
	Difficulty   string                 `json:"difficulty"`
	LikeCount    int                    `json:"like_count"`
	ViewCount    int                    `json:"view_count"`
	MakeCount    int                    `json:"make_count"`
	Liked        bool                   `json:"liked"`
	User         CommunityPostAuthor    `json:"user"`
	CreatedAt    time.Time              `json:"created_at"`
}

// LikeResponse 点赞响应
type LikeResponse struct {
	Liked     bool `json:"liked"`
	LikeCount int  `json:"like_count"`
}
