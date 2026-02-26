package request

// CommunityPostListRequest 社区作品列表请求
type CommunityPostListRequest struct {
	Page     int `form:"page"`     // 页码
	PageSize int `form:"pageSize"` // 每页数量
}

// CreateCommunityPostRequest 发布社区作品请求
type CreateCommunityPostRequest struct {
	Title           string                 `json:"title" binding:"required"`
	Description     string                 `json:"description"`
	BeadData        map[string]interface{} `json:"bead_data" binding:"required"`
	GridWidth       int                    `json:"grid_width" binding:"required"`
	GridHeight      int                    `json:"grid_height" binding:"required"`
	BeadCount       int                    `json:"bead_count"`
	ColorCount      int                    `json:"color_count"`
	Difficulty      string                 `json:"difficulty"`
	ThumbnailBase64 string                 `json:"thumbnail_base64"` // 前端Canvas生成的缩略图base64
	ProjectID       *uint                  `json:"project_id"`
}
