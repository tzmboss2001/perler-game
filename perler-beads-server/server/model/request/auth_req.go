package request

// RegisterReq 邮箱注册请求
type RegisterReq struct {
	Email    string `json:"email" binding:"required,email,max=100"`
	Password string `json:"password" binding:"required,min=6,max=50"`
	Username string `json:"username" binding:"required,min=2,max=50"`
	Nickname string `json:"nickname" binding:"max=50"`
}

// LoginReq 邮箱登录请求
type LoginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshTokenReq 刷新Token请求
type RefreshTokenReq struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// ChangePasswordReq 修改密码请求
type ChangePasswordReq struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=50"`
}

// ResetPasswordReq 重置密码请求（找回密码）
type ResetPasswordReq struct {
	Email       string `json:"email" binding:"required,email"`
	Code        string `json:"code" binding:"required,len=6"`
	NewPassword string `json:"new_password" binding:"required,min=6,max=50"`
}

// SendCodeReq 发送验证码请求
type SendCodeReq struct {
	Email string `json:"email" binding:"required,email"`
	Type  string `json:"type" binding:"required,oneof=register reset"` // register=注册, reset=重置密码
}

// SmartLoginReq 智能登录请求（自动注册+登录）
type SmartLoginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6,max=50"`
}
