package router

import (
	v1 "perler-beads-server/api/v1/auth"

	"github.com/gin-gonic/gin"
)

// InitAuthRouter 初始化认证路由（公开路由，无需登录）
func InitAuthRouter(Router *gin.RouterGroup) {
	authRouter := Router.Group("auth")
	authApi := v1.AuthApi{}
	{
		authRouter.POST("register", authApi.Register)          // 邮箱注册
		authRouter.POST("login", authApi.Login)                // 邮箱登录
		authRouter.POST("smart-login", authApi.SmartLogin)     // 智能登录（自动注册+登录）
		authRouter.POST("wechat-login", authApi.WechatLogin)   // 微信登录
		authRouter.POST("phone-login", authApi.PhoneLogin)     // 手机号登录
		authRouter.POST("refresh-token", authApi.RefreshToken) // 刷新 Token
	}
}

// InitAuthPrivateRouter 初始化认证私有路由（需要登录）
func InitAuthPrivateRouter(Router *gin.RouterGroup) {
	authRouter := Router.Group("auth")
	authApi := v1.AuthApi{}
	{
		authRouter.GET("user-info", authApi.GetUserInfo)           // 获取用户信息
		authRouter.POST("change-password", authApi.ChangePassword) // 修改密码
		authRouter.DELETE("delete-account", authApi.DeleteAccount) // 注销账号
	}
}
