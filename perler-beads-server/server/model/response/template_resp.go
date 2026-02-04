package response

import "time"

// TemplateResponse 模板响应
type TemplateResponse struct {
	ID           uint                   `json:"id"`
	CreatedAt    time.Time              `json:"created_at"`
	Name         string                 `json:"name"`
	CategoryID   uint                   `json:"category_id"`
	CategoryName string                 `json:"category_name,omitempty"`
	ThumbnailURL string                 `json:"thumbnail_url"`
	BeadData     map[string]interface{} `json:"bead_data,omitempty"` // 详情时返回
	GridWidth    int                    `json:"grid_width"`
	GridHeight   int                    `json:"grid_height"`
	GridSize     string                 `json:"grid_size"` // 例如 "29x29"
	BeadCount    int                    `json:"bead_count"`
	ColorCount   int                    `json:"color_count"`
	Difficulty   string                 `json:"difficulty"`
	IsFeatured   bool                   `json:"is_featured"`
	UseCount     int                    `json:"use_count"`
	Status       int                    `json:"status"`
}

// TemplateListResponse 模板列表响应（简化版，不含 bead_data）
type TemplateListResponse struct {
	ID           uint      `json:"id"`
	Name         string    `json:"name"`
	CategoryID   uint      `json:"category_id"`
	CategoryName string    `json:"category_name,omitempty"`
	ThumbnailURL string    `json:"thumbnail_url"`
	GridSize     string    `json:"grid_size"`
	BeadCount    int       `json:"bead_count"`
	ColorCount   int       `json:"color_count"`
	Difficulty   string    `json:"difficulty"`
	IsFeatured   bool      `json:"is_featured"`
	UseCount     int       `json:"use_count"`
	CreatedAt    time.Time `json:"created_at"`
}

// FeaturedTemplateResponse 精选模板响应（首页用）
type FeaturedTemplateResponse struct {
	ID           uint   `json:"id"`
	Title        string `json:"title"`         // 使用 name 映射
	ImageURL     string `json:"imageUrl"`      // 使用 thumbnail_url 映射
	BeadCount    int    `json:"beadCount"`
	GridSize     string `json:"gridSize"`
	Difficulty   string `json:"difficulty"`
	IsOfficial   bool   `json:"isOfficial"`    // 官方模板都是 true
	Category     string `json:"category"`      // 分类名称
}

// CategoryResponse 分类响应
type CategoryResponse struct {
	ID            uint   `json:"id"`
	Name          string `json:"name"`
	Icon          string `json:"icon"`
	SortOrder     int    `json:"sort_order"`
	TemplateCount int    `json:"template_count"` // 该分类下的模板数量
}
