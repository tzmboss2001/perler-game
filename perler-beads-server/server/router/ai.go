package router

import (
	"perler-beads-server/api/v1/ai"

	"github.com/gin-gonic/gin"
)

func InitAiRouter(Router *gin.RouterGroup) {
	aiApi := ai.AiApi{}
	aiRouter := Router.Group("ai")
	{
		aiRouter.POST("cutout", aiApi.Cutout)
	}
}
