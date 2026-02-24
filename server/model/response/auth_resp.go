package response

// SmartLoginResp 智能登录响应
type SmartLoginResp struct {
	Token     string   `json:"token"`
	UserInfo  UserInfo `json:"user_info"`
	IsNewUser bool     `json:"is_new_user"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID       uint   `json:"id"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
	Avatar   string `json:"avatar"`
}
