package router

import (
	v1 "perler-beads-server/api/v1/project"

	"github.com/gin-gonic/gin"
)

// InitProjectRouter 初始化作品公开路由（无需登录）
func InitProjectRouter(Router *gin.RouterGroup) {
	projectRouter := Router.Group("project")
	projectApi := v1.ProjectApi{}
	{
		projectRouter.GET("list", projectApi.GetList)                // 作品列表（查看自己的项目需要device_id或登录）
		projectRouter.GET(":id", projectApi.GetById)                 // 作品详情
		projectRouter.PUT(":id/progress", projectApi.UpdateProgress) // 更新制作进度
	}
}

// InitProjectPrivateRouter 初始化作品私有路由（需要登录）
func InitProjectPrivateRouter(Router *gin.RouterGroup) {
	projectRouter := Router.Group("project")
	projectApi := v1.ProjectApi{}
	{
		projectRouter.POST("create", projectApi.Create) // 创建作品（需要登录）
		projectRouter.PUT(":id", projectApi.Update)     // 更新作品（需要登录）
		projectRouter.DELETE(":id", projectApi.Delete)  // 删除作品（需要登录）
	}
}
