package request

// CommunityPostListRequest 社区作品列表请求
type CommunityPostListRequest struct {
	Page     int `form:"page"`     // 页码
	PageSize int `form:"pageSize"` // 每页数量
}
