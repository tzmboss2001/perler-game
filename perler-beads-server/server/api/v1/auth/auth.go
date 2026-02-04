package auth

import (
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/service"

	"github.com/gin-gonic/gin"
)

type AuthApi struct{}

// Register 邮箱注册
// @Tags     Auth
// @Summary  邮箱注册
// @accept   application/json
// @Produce  application/json
// @Param    data body request.RegisterReq true "注册参数"
// @Success  200 {object} response.Response{data=response.RegisterResp} "注册成功"
// @Router   /auth/register [post]
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
// @Tags     Auth
// @Summary  邮箱登录
// @accept   application/json
// @Produce  application/json
// @Param    data body request.LoginReq true "登录参数"
// @Success  200 {object} response.Response{data=response.LoginResp} "登录成功"
// @Router   /auth/login [post]
func (a *AuthApi) Login(c *gin.Context) {
	var req request.LoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	// 获取客户端 IP
	ip := c.ClientIP()

	resp, err := service.AuthServiceApp.Login(&req, ip)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(resp, c)
}

// SmartLogin 智能登录（邮箱不存在时自动注册）
// @Tags     Auth
// @Summary  智能登录（邮箱不存在时自动注册）
// @accept   application/json
// @Produce  application/json
// @Param    data body request.SmartLoginReq true "登录参数"
// @Success  200 {object} response.Response{data=response.SmartLoginResp} "登录成功"
// @Router   /auth/smart-login [post]
func (a *AuthApi) SmartLogin(c *gin.Context) {
	var req request.SmartLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	// 获取客户端 IP
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
// @Tags     Auth
// @Summary  获取当前用户信息
// @accept   application/json
// @Produce  application/json
// @Security ApiKeyAuth
// @Success  200 {object} response.Response{data=response.UserInfo} "获取成功"
// @Router   /auth/user-info [get]
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
// @Tags     Auth
// @Summary  修改密码
// @accept   application/json
// @Produce  application/json
// @Security ApiKeyAuth
// @Param    data body request.ChangePasswordReq true "修改密码参数"
// @Success  200 {object} response.Response "修改成功"
// @Router   /auth/change-password [post]
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

// WechatLogin 微信登录
// @Tags     Auth
// @Summary  微信登录
// @accept   application/json
// @Produce  application/json
// @Param    data body object true "微信登录参数"
// @Success  200 {object} response.Response{data=object} "登录成功"
// @Router   /auth/wechat-login [post]
func (a *AuthApi) WechatLogin(c *gin.Context) {
	// TODO: 实现微信登录逻辑
	response.OkWithMessage("微信登录接口待实现", c)
}

// PhoneLogin 手机号登录
// @Tags     Auth
// @Summary  手机号登录
// @accept   application/json
// @Produce  application/json
// @Param    data body object true "手机号登录参数"
// @Success  200 {object} response.Response{data=object} "登录成功"
// @Router   /auth/phone-login [post]
func (a *AuthApi) PhoneLogin(c *gin.Context) {
	// TODO: 实现手机号登录逻辑
	response.OkWithMessage("手机号登录接口待实现", c)
}

// RefreshToken 刷新 Token
// @Tags     Auth
// @Summary  刷新 Token
// @accept   application/json
// @Produce  application/json
// @Success  200 {object} response.Response{data=object} "刷新成功"
// @Router   /auth/refresh-token [post]
func (a *AuthApi) RefreshToken(c *gin.Context) {
	// TODO: 实现刷新 Token 逻辑
	response.OkWithMessage("刷新 Token 接口待实现", c)
}

// DeleteAccount 注销账号
// @Tags     Auth
// @Summary  注销账号（永久删除用户所有数据）
// @accept   application/json
// @Produce  application/json
// @Security ApiKeyAuth
// @Success  200 {object} response.Response "注销成功"
// @Router   /auth/delete-account [delete]
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

	response.OkWithMessage("账号已注销，感谢您的使用", c)
}
