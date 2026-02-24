package auth

import (
	"perler-game-server/model/request"
	"perler-game-server/model/response"
	"perler-game-server/service"

	"github.com/gin-gonic/gin"
)

type AuthApi struct{}

// SmartLogin 智能登录（邮箱不存在时自动注册）
func (a *AuthApi) SmartLogin(c *gin.Context) {
	var req request.SmartLoginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	ip := c.ClientIP()
	resp, err := service.AuthServiceApp.SmartLogin(&req, ip)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
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
