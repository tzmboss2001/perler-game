package request

// WorkSaveReq 保存作品请求
type WorkSaveReq struct {
	Title        string  `json:"title" binding:"max=100"`
	BoardJSON    string  `json:"board_json" binding:"required"`
	Thumbnail    string  `json:"thumbnail"`
	TemplateID   string  `json:"template_id"`
	BeadCount    int     `json:"bead_count"`
	BoardWidth   int     `json:"board_width" binding:"required"`
	BoardHeight  int     `json:"board_height" binding:"required"`
	IroningScore int     `json:"ironing_score"`
	FailureType  string  `json:"failure_type"`
	RiskScore    float64 `json:"risk_score"`
	DeviceID     string  `json:"device_id"`
}
