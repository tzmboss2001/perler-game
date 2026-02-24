package router

import (
	v1 "perler-game-server/api/v1/auth"

	"github.com/gin-gonic/gin"
)

// InitAuthPublicRouter 初始化认证公开路由
func InitAuthPublicRouter(Router *gin.RouterGroup) {
	authRouter := Router.Group("auth")
	authApi := v1.AuthApi{}
	{
		authRouter.POST("smart-login", authApi.SmartLogin)
	}
}

// InitAuthPrivateRouter 初始化认证私有路由
func InitAuthPrivateRouter(Router *gin.RouterGroup) {
	authRouter := Router.Group("auth")
	authApi := v1.AuthApi{}
	{
		authRouter.GET("user-info", authApi.GetUserInfo)
		authRouter.POST("change-password", authApi.ChangePassword)
	}
}
