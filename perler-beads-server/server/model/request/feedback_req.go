package request

// CreateFeedbackReq 创建反馈请求
type CreateFeedbackReq struct {
	Type    string `json:"type" binding:"required,oneof=bug suggestion other"` // 反馈类型
	Content string `json:"content" binding:"required,min=10,max=500"`          // 反馈内容
	Contact string `json:"contact" binding:"omitempty,max=100"`                // 联系方式（选填）
}
