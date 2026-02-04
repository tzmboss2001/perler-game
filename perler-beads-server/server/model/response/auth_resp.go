package response

// LoginResp 登录响应
type LoginResp struct {
	Token    string   `json:"token"`
	UserInfo UserInfo `json:"user_info"`
}

// RegisterResp 注册响应
type RegisterResp struct {
	UserID uint `json:"user_id"`
}

// SmartLoginResp 智能登录响应
type SmartLoginResp struct {
	Token     string   `json:"token"`
	UserInfo  UserInfo `json:"user_info"`
	IsNewUser bool     `json:"is_new_user"` // 是否为新注册用户
}

// UserInfo 用户信息
type UserInfo struct {
	ID            uint   `json:"id"`
	Email         string `json:"email"`
	Username      string `json:"username"`
	Nickname      string `json:"nickname"`
	Avatar        string `json:"avatar"`
	EmailVerified bool   `json:"email_verified"`
	MemberLevel   int    `json:"member_level"`  // 会员等级
	MemberExpire  string `json:"member_expire"` // 会员过期时间
}
