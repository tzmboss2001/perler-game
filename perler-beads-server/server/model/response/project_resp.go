package response

// ProjectInfo 方案信息响应（列表用）
type ProjectInfo struct {
	ID           uint                   `json:"id"`
	Name         string                 `json:"name"`
	ThumbnailURL string                 `json:"thumbnail_url"`
	Settings     map[string]interface{} `json:"settings"`
	Progress     map[string]interface{} `json:"progress"`
	Status       int                    `json:"status"`
	CreatedAt    string                 `json:"created_at"`
	UpdatedAt    string                 `json:"updated_at"`
}

// ProjectDetail 方案详情响应
type ProjectDetail struct {
	ID            uint                   `json:"id"`
	Name          string                 `json:"name"`
	ThumbnailURL  string                 `json:"thumbnail_url"`
	OriginalImage string                 `json:"original_image"`
	BeadData      map[string]interface{} `json:"bead_data"`
	Settings      map[string]interface{} `json:"settings"`
	Progress      map[string]interface{} `json:"progress"`
	Status        int                    `json:"status"`
	CreatedAt     string                 `json:"created_at"`
	UpdatedAt     string                 `json:"updated_at"`
}
