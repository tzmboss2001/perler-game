package request

// CreateFinishedWorkRequest 创建成品作品
type CreateFinishedWorkRequest struct {
	Title        string   `json:"title" binding:"required,max=120"`
	Description  string   `json:"description" binding:"max=500"`
	ImagesBase64 []string `json:"images_base64" binding:"required,min=1,max=9"`
	IsPublic     *bool    `json:"is_public"`
}

// ListFinishedWorkRequest 成品列表
type ListFinishedWorkRequest struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Keyword  string `form:"keyword"`
	Sort     string `form:"sort"`
}

// CreateFinishedWorkCommentRequest 创建成品评论
type CreateFinishedWorkCommentRequest struct {
	Content string `json:"content" binding:"required,max=300"`
}

// CreateFinishedWorkReportRequest 举报成品
type CreateFinishedWorkReportRequest struct {
	Reason string `json:"reason" binding:"required,max=100"`
	Detail string `json:"detail" binding:"max=500"`
}

// FinishedWorkModerationReportListRequest 成品举报审核列表
type FinishedWorkModerationReportListRequest struct {
	Page     int `form:"page"`
	PageSize int `form:"pageSize"`
	Status   int `form:"status"` // 0待处理 1已采纳 2已驳回 -1全部
}

// HandleFinishedWorkReportRequest 处理成品举报
type HandleFinishedWorkReportRequest struct {
	Action string `json:"action" binding:"required,oneof=accept reject"`
	Note   string `json:"note" binding:"max=200"`
}

// FinishedWorkModerationListRequest 成品审核列表
type FinishedWorkModerationListRequest struct {
	Page         int `form:"page"`
	PageSize     int `form:"pageSize"`
	ReviewStatus int `form:"review_status"` // 0待审 1通过 2驳回 3下架 -1全部
}

// ReviewFinishedWorkRequest 审核成品
type ReviewFinishedWorkRequest struct {
	Action string `json:"action" binding:"required,oneof=approve reject hide restore"`
	Reason string `json:"reason" binding:"max=200"`
}
