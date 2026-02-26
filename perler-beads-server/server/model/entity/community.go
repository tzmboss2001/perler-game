package entity

import (
	"time"
)

// CommunityPost 社区作品
type CommunityPost struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	UserID       uint      `json:"user_id" gorm:"index;not null"`                     // 发布者ID
	ProjectID    *uint     `json:"project_id" gorm:"index"`                           // 关联方案ID（可选）
	Title        string    `json:"title" gorm:"size:100;not null"`                    // 作品标题
	Description  string    `json:"description" gorm:"size:500"`                       // 作品描述
	ThumbnailURL string    `json:"thumbnail_url" gorm:"size:500;not null"`            // 缩略图URL
	ImageURLs    JSON      `json:"image_urls" gorm:"type:json"`                       // 成品图片列表
	BeadData     JSON      `json:"bead_data" gorm:"type:json;not null"`               // 珠子数据
	GridWidth    int       `json:"grid_width" gorm:"default:0"`                       // 网格宽度
	GridHeight   int       `json:"grid_height" gorm:"default:0"`                      // 网格高度
	BeadCount    int       `json:"bead_count" gorm:"default:0"`                       // 珠子总数
	ColorCount   int       `json:"color_count" gorm:"default:0"`                      // 颜色种类数
	Difficulty   string    `json:"difficulty" gorm:"size:20;default:medium"`           // 难度
	Tags         string    `json:"tags" gorm:"size:200"`                              // 标签（逗号分隔）
	LikeCount    int       `json:"like_count" gorm:"default:0;index"`                 // 点赞数
	ViewCount    int       `json:"view_count" gorm:"default:0"`                       // 浏览数
	MakeCount    int       `json:"make_count" gorm:"default:0"`                       // 制作数
	Status       int       `json:"status" gorm:"default:1;index;comment:0审核中1正常2下架"` // 状态
}

// TableName 指定表名
func (CommunityPost) TableName() string {
	return "community_posts"
}
