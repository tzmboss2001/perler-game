package request

// CommunityPostListRequest 社区作品列表请求
type CommunityPostListRequest struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Tag      string `form:"tag"`
	Category string `form:"category"`
	Keyword  string `form:"keyword"`
	Sort     string `form:"sort"` // newest / popular / most_made / recommended
}

// CommunityMyPostListRequest 我的社区发布列表请求
type CommunityMyPostListRequest struct {
	Page         int `form:"page"`
	PageSize     int `form:"pageSize"`
	ReviewStatus int `form:"review_status"` // 0待审 1通过 2驳回 3下架 -1全部
}

// CreateCommunityPostRequest 发布社区作品请求
type CreateCommunityPostRequest struct {
	Title           string                 `json:"title" binding:"required"`
	Description     string                 `json:"description"`
	Tags            string                 `json:"tags"`
	Category        string                 `json:"category"`
	BeadData        map[string]interface{} `json:"bead_data" binding:"required"`
	GridWidth       int                    `json:"grid_width" binding:"required"`
	GridHeight      int                    `json:"grid_height" binding:"required"`
	BeadCount       int                    `json:"bead_count"`
	ColorCount      int                    `json:"color_count"`
	Difficulty      string                 `json:"difficulty"`
	PaletteBrand    string                 `json:"palette_brand"`
	PaletteVersion  string                 `json:"palette_version"`
	PaletteName     string                 `json:"palette_name"`
	ThumbnailBase64 string                 `json:"thumbnail_base64"`
	ProjectID       *uint                  `json:"project_id"`
}

// CommunityModerationListRequest 审核列表请求
type CommunityModerationListRequest struct {
	Page         int `form:"page"`
	PageSize     int `form:"pageSize"`
	ReviewStatus int `form:"review_status"` // 0待审 1通过 2驳回 3下架 -1全部
}

// ReviewCommunityPostRequest 审核操作请求
type ReviewCommunityPostRequest struct {
	Action string `json:"action" binding:"required,oneof=approve reject hide restore"`
	Reason string `json:"reason" binding:"max=200"`
}

// CommunityModerationLogListRequest 审核日志分页请求
type CommunityModerationLogListRequest struct {
	Page     int  `form:"page"`
	PageSize int  `form:"pageSize"`
	PostID   uint `form:"post_id"`
}

// CommunityPreviewBackfillRequest 缺失详情图回填请求
type CommunityPreviewBackfillRequest struct {
	Limit int `json:"limit"`
}

// CreateCommunityReportRequest 提交举报请求
type CreateCommunityReportRequest struct {
	Reason       string   `json:"reason" binding:"required,max=80"`
	Detail       string   `json:"detail" binding:"max=500"`
	EvidenceURLs []string `json:"evidence_urls"`
}

// CommunityModerationReportListRequest 举报列表分页请求
type CommunityModerationReportListRequest struct {
	Page        int  `form:"page"`
	PageSize    int  `form:"pageSize"`
	Status      int  `form:"status"`       // 0待处理 1已采纳 2已驳回 -1全部
	HighOnly    bool `form:"high_only"`    // 仅高优先级举报
	OverdueOnly bool `form:"overdue_only"` // 仅超时待处理
}

// HandleCommunityReportRequest 处理举报请求
type HandleCommunityReportRequest struct {
	Action string `json:"action" binding:"required,oneof=accept reject"`
	Note   string `json:"note" binding:"max=200"`
}

// BatchHandleCommunityReportsRequest 批量处理举报
type BatchHandleCommunityReportsRequest struct {
	ReportIDs []uint `json:"report_ids" binding:"required,min=1,max=100,dive,gt=0"`
	Action    string `json:"action" binding:"required,oneof=accept reject"`
	Note      string `json:"note" binding:"max=200"`
}
