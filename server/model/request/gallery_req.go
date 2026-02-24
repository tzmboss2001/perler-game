package request

// GalleryListReq 广场列表请求
type GalleryListReq struct {
	Page     int    `form:"page" binding:"min=1"`
	PageSize int    `form:"pageSize" binding:"min=1,max=50"`
	Sort     string `form:"sort"` // latest, popular, crash
}

// CommentReq 评论请求
type CommentReq struct {
	Content string `json:"content" binding:"required,max=500"`
}
