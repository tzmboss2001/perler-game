package router

import (
	v1 "perler-beads-server/api/v1/feedback"

	"github.com/gin-gonic/gin"
)

// InitFeedbackRouter 初始化反馈路由（公开路由，无需登录也可提交）
func InitFeedbackRouter(Router *gin.RouterGroup) {
	feedbackRouter := Router.Group("feedback")
	feedbackApi := v1.FeedbackApi{}
	{
		feedbackRouter.POST("create", feedbackApi.Create) // 提交反馈
	}
}
