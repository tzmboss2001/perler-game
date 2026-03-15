package router

import (
	v1 "perler-beads-server/api/v1/finishedwork"

	"github.com/gin-gonic/gin"
)

func InitFinishedWorkRouter(Router *gin.RouterGroup) {
	finishedWorkRouter := Router.Group("finished-works")
	finishedWorkApi := v1.FinishedWorkApi{}
	{
		finishedWorkRouter.POST("", finishedWorkApi.Create)
		finishedWorkRouter.GET("my", finishedWorkApi.ListMy)
		finishedWorkRouter.DELETE(":id", finishedWorkApi.Delete)
		finishedWorkRouter.POST(":id/like", finishedWorkApi.ToggleLike)
		finishedWorkRouter.POST(":id/report", finishedWorkApi.Report)
		finishedWorkRouter.GET("moderation/works", finishedWorkApi.GetModerationWorks)
		finishedWorkRouter.POST("moderation/works/:workId/review", finishedWorkApi.ReviewWork)
		finishedWorkRouter.GET("moderation/reports", finishedWorkApi.GetModerationReports)
		finishedWorkRouter.POST("moderation/reports/:reportId/handle", finishedWorkApi.HandleReport)
	}
}

func InitFinishedWorkPublicRouter(Router *gin.RouterGroup) {
	finishedWorkRouter := Router.Group("finished-works")
	finishedWorkApi := v1.FinishedWorkApi{}
	{
		finishedWorkRouter.GET("public", finishedWorkApi.ListPublic)
		finishedWorkRouter.GET("users/:userId/public", finishedWorkApi.ListPublicByUser)
		finishedWorkRouter.GET(":id", finishedWorkApi.GetPublicByID)
	}
}
