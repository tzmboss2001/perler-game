package request

// CreateProjectReq 创建方案请求
type CreateProjectReq struct {
	Name          string                 `json:"name" binding:"required,max=100"`
	DeviceID      string                 `json:"device_id"`
	ThumbnailURL  string                 `json:"thumbnail_url"`
	OriginalImage string                 `json:"original_image" binding:"required"`
	BeadData      map[string]interface{} `json:"bead_data" binding:"required"`
	Settings      map[string]interface{} `json:"settings" binding:"required"`
}

// UpdateProjectReq 更新方案请求
type UpdateProjectReq struct {
	Name     string                 `json:"name"`
	BeadData map[string]interface{} `json:"bead_data"`
	Settings map[string]interface{} `json:"settings"`
	Status   *int                   `json:"status"` // 使用指针以区分0和未传
}

// UpdateProgressReq 更新进度请求
type UpdateProgressReq struct {
	Progress map[string]interface{} `json:"progress" binding:"required"`
}

// ProjectListReq 列表查询请求
type ProjectListReq struct {
	Page     int    `form:"page" binding:"min=1"`
	PageSize int    `form:"pageSize" binding:"min=1,max=50"`
	DeviceID string `form:"device_id"`
	Status   *int   `form:"status"` // 使用指针以区分0和未传
}
