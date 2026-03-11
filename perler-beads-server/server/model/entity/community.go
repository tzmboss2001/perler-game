package entity

import "time"

// CommunityPost 社区作品
type CommunityPost struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	UserID       uint      `json:"user_id" gorm:"index;index:idx_user_content_hash,priority:1;not null"`
	ProjectID    *uint     `json:"project_id" gorm:"index"`
	Title        string    `json:"title" gorm:"size:100;not null"`
	Description  string    `json:"description" gorm:"size:500"`
	ThumbnailURL string    `json:"thumbnail_url" gorm:"size:500;not null"`
	PreviewURL   string    `json:"preview_url" gorm:"size:500"`
	ImageURLs    JSON      `json:"image_urls" gorm:"type:json"`
	BeadData     JSON      `json:"bead_data" gorm:"type:json;not null"`
	GridWidth    int       `json:"grid_width" gorm:"default:0"`
	GridHeight   int       `json:"grid_height" gorm:"default:0"`
	BeadCount    int       `json:"bead_count" gorm:"default:0"`
	ColorCount   int       `json:"color_count" gorm:"default:0"`
	Difficulty   string    `json:"difficulty" gorm:"size:20;default:medium"`
	PaletteBrand string    `json:"palette_brand" gorm:"size:20;default:unknown"`
	PaletteVer   string    `json:"palette_version" gorm:"size:32;default:unknown"`
	PaletteName  string    `json:"palette_name" gorm:"size:100"`
	Category     string    `json:"category" gorm:"size:32;default:other;index"`
	Tags         string    `json:"tags" gorm:"size:200"`
	ContentHash  string    `json:"content_hash" gorm:"size:64;index:idx_user_content_hash,priority:2"`
	LikeCount    int       `json:"like_count" gorm:"default:0;index"`
	ViewCount    int       `json:"view_count" gorm:"default:0"`
	MakeCount    int       `json:"make_count" gorm:"default:0"`
	Status       int       `json:"status" gorm:"default:1;index;comment:0隐藏1展示"`

	ReviewStatus int        `json:"review_status" gorm:"default:1;index;comment:0待审1通过2驳回3下架"`
	ReviewReason string     `json:"review_reason" gorm:"size:200"`
	ReviewedBy   *uint      `json:"reviewed_by" gorm:"index"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
	PublishedAt  *time.Time `json:"published_at"`
}

func (CommunityPost) TableName() string {
	return "community_posts"
}

// CommunityLike 社区点赞
type CommunityLike struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UserID    uint      `json:"user_id" gorm:"uniqueIndex:idx_user_post;not null"`
	PostID    uint      `json:"post_id" gorm:"uniqueIndex:idx_user_post;not null;index"`
}

func (CommunityLike) TableName() string {
	return "community_likes"
}
