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
		userRouter.GET("profile", userApi.GetProfile)    // 获取用户信息
		userRouter.PUT("profile", userApi.UpdateProfile) // 更新用户信息
		userRouter.GET("member", userApi.GetMember)      // 获取会员信息
	}
}
