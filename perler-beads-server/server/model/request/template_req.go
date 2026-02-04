package request

// CreateTemplateRequest 创建模板请求
type CreateTemplateRequest struct {
	Name         string                 `json:"name" binding:"required"`     // 模板名称
	CategoryID   uint                   `json:"category_id"`                 // 分类ID
	ThumbnailURL string                 `json:"thumbnail_url"`               // 缩略图URL
	BeadData     map[string]interface{} `json:"bead_data" binding:"required"` // 珠子数据
	GridWidth    int                    `json:"grid_width"`                  // 网格宽度
	GridHeight   int                    `json:"grid_height"`                 // 网格高度
	BeadCount    int                    `json:"bead_count"`                  // 珠子总数
	ColorCount   int                    `json:"color_count"`                 // 颜色种类数
	Difficulty   string                 `json:"difficulty"`                  // 难度
	IsFeatured   bool                   `json:"is_featured"`                 // 是否精选
	SortOrder    int                    `json:"sort_order"`                  // 排序
}

// UpdateTemplateRequest 更新模板请求
type UpdateTemplateRequest struct {
	Name         string                 `json:"name"`          // 模板名称
	CategoryID   uint                   `json:"category_id"`   // 分类ID
	ThumbnailURL string                 `json:"thumbnail_url"` // 缩略图URL
	BeadData     map[string]interface{} `json:"bead_data"`     // 珠子数据
	GridWidth    int                    `json:"grid_width"`    // 网格宽度
	GridHeight   int                    `json:"grid_height"`   // 网格高度
	BeadCount    int                    `json:"bead_count"`    // 珠子总数
	ColorCount   int                    `json:"color_count"`   // 颜色种类数
	Difficulty   string                 `json:"difficulty"`    // 难度
	IsFeatured   *bool                  `json:"is_featured"`   // 是否精选
	SortOrder    *int                   `json:"sort_order"`    // 排序
	Status       *int                   `json:"status"`        // 状态
}

// TemplateListRequest 模板列表请求
type TemplateListRequest struct {
	Page       int    `form:"page"`        // 页码
	PageSize   int    `form:"pageSize"`    // 每页数量
	CategoryID uint   `form:"category_id"` // 分类ID
	IsFeatured *bool  `form:"is_featured"` // 是否精选
	Difficulty string `form:"difficulty"`  // 难度
	Keyword    string `form:"keyword"`     // 搜索关键词
}

// CreateCategoryRequest 创建分类请求
type CreateCategoryRequest struct {
	Name      string `json:"name" binding:"required"` // 分类名称
	Icon      string `json:"icon"`                    // 图标
	SortOrder int    `json:"sort_order"`              // 排序
}

// UpdateCategoryRequest 更新分类请求
type UpdateCategoryRequest struct {
	Name      string `json:"name"`       // 分类名称
	Icon      string `json:"icon"`       // 图标
	SortOrder *int   `json:"sort_order"` // 排序
	Status    *int   `json:"status"`     // 状态
}
