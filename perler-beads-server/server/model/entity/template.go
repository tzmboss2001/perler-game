package entity

import (
	"time"
)

// Template 模板
type Template struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	Name         string    `json:"name" gorm:"size:100;not null"`                   // 模板名称
	CategoryID   uint      `json:"category_id" gorm:"index"`                        // 分类ID
	ThumbnailURL string    `json:"thumbnail_url" gorm:"size:500"`                   // 缩略图URL
	BeadData     JSON      `json:"bead_data" gorm:"type:json"`                      // 珠子数据 {width, height, beads[]}
	GridWidth    int       `json:"grid_width" gorm:"default:0"`                     // 网格宽度
	GridHeight   int       `json:"grid_height" gorm:"default:0"`                    // 网格高度
	BeadCount    int       `json:"bead_count" gorm:"default:0"`                     // 珠子总数
	ColorCount   int       `json:"color_count" gorm:"default:0"`                    // 颜色种类数
	Difficulty   string    `json:"difficulty" gorm:"size:20;default:easy"`          // 难度：easy/medium/hard
	IsFeatured   bool      `json:"is_featured" gorm:"default:false;index"`          // 是否精选（首页展示）
	SortOrder    int       `json:"sort_order" gorm:"default:0"`                     // 排序（越大越靠前）
	UseCount     int       `json:"use_count" gorm:"default:0"`                      // 使用次数
	Status       int       `json:"status" gorm:"default:1;comment:0下架1上架;index"` // 状态
}

// TableName 指定表名
func (Template) TableName() string {
	return "templates"
}

// TemplateCategory 模板分类
type TemplateCategory struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Name      string    `json:"name" gorm:"size:50;not null;uniqueIndex"` // 分类名称
	Icon      string    `json:"icon" gorm:"size:50"`                      // 图标（emoji或图标名）
	SortOrder int       `json:"sort_order" gorm:"default:0"`              // 排序
	Status    int       `json:"status" gorm:"default:1"`                  // 状态
}

// TableName 指定表名
func (TemplateCategory) TableName() string {
	return "template_categories"
}
