package router

import (
	v1 "perler-beads-server/api/v1/user"

	"github.com/gin-gonic/gin"
)

// InitUserRouter 初始化用户路由
func InitUserRouter(Router *gin.RouterGroup) {
	userRouter := Router.Group("user")
	userApi := v1.UserApi{}
	{
		userRouter.GET("profile", userApi.GetProfile)
		userRouter.PUT("profile", userApi.UpdateProfile)
		userRouter.GET("member", userApi.GetMember)
		userRouter.GET("preferences", userApi.GetPreferences)
		userRouter.PUT("preferences", userApi.UpdatePreferences)
	}
}
