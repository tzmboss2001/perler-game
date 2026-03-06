package auth

import (
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/service"
	"perler-beads-server/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

type AuthApi struct{}

// Register 邮箱注册
func (a *AuthApi) Register(c *gin.Context) {
	var req request.RegisterReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	userID, err := service.AuthServiceApp.Register(&req)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(response.RegisterResp{UserID: userID}, c)
}

// Login 邮箱登录
func (a *AuthApi) Login(c *gin.Context) {
	var req request.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	ip := c.ClientIP()
	resp, err := service.AuthServiceApp.Login(&req, ip)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(resp, c)
}

// SmartLogin 智能登录（不存在则自动注册）
func (a *AuthApi) SmartLogin(c *gin.Context) {
	var req request.SmartLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	ip := c.ClientIP()
	loginResp, isNewUser, err := service.AuthServiceApp.SmartLogin(&req, ip)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	resp := response.SmartLoginResp{
		Token:     loginResp.Token,
		UserInfo:  loginResp.UserInfo,
		IsNewUser: isNewUser,
	}
	response.OkWithData(resp, c)
}

// GetUserInfo 获取当前用户信息
func (a *AuthApi) GetUserInfo(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	info, err := service.AuthServiceApp.GetUserInfo(userID.(uint))
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(info, c)
}

// ChangePassword 修改密码
func (a *AuthApi) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	var req request.ChangePasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	if err := service.AuthServiceApp.ChangePassword(userID.(uint), &req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithMessage("密码修改成功", c)
}

// WechatLogin 微信登录（MVP：按 openid 映射为系统账号）
func (a *AuthApi) WechatLogin(c *gin.Context) {
	type wechatLoginReq struct {
		OpenID   string `json:"openid" binding:"required"`
		Code     string `json:"code"`
		Nickname string `json:"nickname"`
		Avatar   string `json:"avatar"`
	}
	var req wechatLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	password := req.Code
	if len(password) < 6 {
		password = "wx_" + req.OpenID
	}
	if len(password) < 6 {
		password = password + "123456"
	}

	email := "wx_" + sanitizeAccountID(req.OpenID) + "@wechat.local"
	ip := c.ClientIP()
	loginResp, _, err := service.AuthServiceApp.SmartLogin(&request.SmartLoginReq{Email: email, Password: password}, ip)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	_ = service.AuthServiceApp.UpdateUserInfo(loginResp.UserInfo.ID, req.Nickname, req.Avatar)
	response.OkWithData(loginResp, c)
}

// PhoneLogin 手机号登录（MVP：按 phone 映射为系统账号）
func (a *AuthApi) PhoneLogin(c *gin.Context) {
	type phoneLoginReq struct {
		Phone string `json:"phone" binding:"required"`
		Code  string `json:"code" binding:"required"`
	}
	var req phoneLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	phone := sanitizeAccountID(req.Phone)
	password := req.Code
	if len(password) < 6 {
		password = "ph_" + phone
	}
	if len(password) < 6 {
		password = password + "123456"
	}

	email := "ph_" + phone + "@phone.local"
	ip := c.ClientIP()
	loginResp, _, err := service.AuthServiceApp.SmartLogin(&request.SmartLoginReq{Email: email, Password: password}, ip)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(loginResp, c)
}

// RefreshToken 刷新 Token
func (a *AuthApi) RefreshToken(c *gin.Context) {
	var req request.RefreshTokenReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	j := utils.NewJWT()
	claims, err := j.ParseToken(req.RefreshToken)
	if err != nil {
		response.FailWithMessage("refresh_token 无效或已过期", c)
		return
	}

	newClaims := j.CreateClaims(claims.UserID, claims.Username)
	token, err := j.CreateToken(newClaims)
	if err != nil {
		response.FailWithMessage("刷新 token 失败", c)
		return
	}

	response.OkWithData(gin.H{"token": token}, c)
}

// DeleteAccount 注销账号
func (a *AuthApi) DeleteAccount(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	if err := service.AuthServiceApp.DeleteAccount(userID.(uint)); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithMessage("账号已注销，感谢使用", c)
}

func sanitizeAccountID(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "anonymous"
	}
	builder := strings.Builder{}
	for _, r := range raw {
		if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			builder.WriteRune(r)
		}
	}
	s := strings.ToLower(builder.String())
	if s == "" {
		return "anonymous"
	}
	return s
}
