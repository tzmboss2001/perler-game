package router

import (
	"github.com/gin-gonic/gin"
	"perler-beads-server/api/v1/depth"
)

// InitDepthRouter 初始化深度估计路由
func InitDepthRouter(Router *gin.RouterGroup) {
	depthApi := depth.DepthApi{}
	depthRouter := Router.Group("depth")
	{
		depthRouter.POST("estimate", depthApi.EstimateDepth) // 深度估计
	}
}
