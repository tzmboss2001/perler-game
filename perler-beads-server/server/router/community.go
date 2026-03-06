package router

import (
	v1 "perler-beads-server/api/v1/community"

	"github.com/gin-gonic/gin"
)

// InitCommunityPublicRouter 初始化社区公开路由
func InitCommunityPublicRouter(Router *gin.RouterGroup) {
	communityRouter := Router.Group("community")
	communityApi := v1.CommunityApi{}
	{
		communityRouter.GET("posts", communityApi.GetPosts)
		communityRouter.GET("posts/:id", communityApi.GetPost)
		communityRouter.POST("posts/:id/make", communityApi.MakePost)
	}
}

// InitCommunityRouter 初始化社区私有路由
func InitCommunityRouter(Router *gin.RouterGroup) {
	communityRouter := Router.Group("community")
	communityApi := v1.CommunityApi{}
	{
		communityRouter.POST("posts", communityApi.CreatePost)
		communityRouter.GET("my/posts", communityApi.GetMyPosts)
		communityRouter.POST("posts/:id/like", communityApi.LikePost)
		communityRouter.POST("posts/:id/comment", communityApi.Comment)
		communityRouter.POST("posts/:id/report", communityApi.ReportPost)

		communityRouter.GET("moderation/posts", communityApi.GetModerationPosts)
		communityRouter.GET("moderation/logs", communityApi.GetModerationLogs)
		communityRouter.GET("moderation/stats", communityApi.GetModerationStats)
		communityRouter.GET("moderation/reports", communityApi.GetModerationReports)
		communityRouter.GET("moderation/reports/alerts", communityApi.GetReportAlerts)
		communityRouter.POST("moderation/reports/batch-handle", communityApi.BatchHandleReports)
		communityRouter.POST("moderation/previews/backfill", communityApi.BackfillMissingPreviews)
		communityRouter.POST("moderation/posts/:id/review", communityApi.ReviewPost)
		communityRouter.POST("moderation/reports/:id/handle", communityApi.HandleReport)
	}
}
