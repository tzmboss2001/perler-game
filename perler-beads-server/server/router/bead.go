package router

import (
	v1 "perler-beads-server/api/v1/bead"

	"github.com/gin-gonic/gin"
)

// InitBeadRouter 初始化珠子数据路由
func InitBeadRouter(Router *gin.RouterGroup) {
	beadRouter := Router.Group("bead")
	beadApi := v1.BeadApi{}
	{
		beadRouter.GET("brands", beadApi.GetBrands)         // 品牌列表
		beadRouter.GET("colors/:brand", beadApi.GetColors)  // 颜色列表
	}
}
