package router

import (
	v1 "perler-game-server/api/v1/work"

	"github.com/gin-gonic/gin"
)

// InitWorkRouter 初始化作品私有路由
func InitWorkRouter(Router *gin.RouterGroup) {
	workRouter := Router.Group("work")
	workApi := v1.WorkApi{}
	{
		workRouter.POST("save", workApi.Save)
		workRouter.GET("list", workApi.List)
		workRouter.GET(":id", workApi.GetByID)
		workRouter.DELETE(":id", workApi.Delete)
		workRouter.POST(":id/publish", workApi.Publish)
	}
}
