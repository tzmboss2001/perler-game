package router

import (
	v1 "perler-game-server/api/v1/challenge"

	"github.com/gin-gonic/gin"
)

// InitChallengePublicRouter 初始化挑战公开路由
func InitChallengePublicRouter(Router *gin.RouterGroup) {
	challengeRouter := Router.Group("challenge")
	challengeApi := v1.ChallengeApi{}
	{
		challengeRouter.GET("daily", challengeApi.GetDaily)
		challengeRouter.GET("weekly", challengeApi.GetWeekly)
		challengeRouter.GET("leaderboard/:id", challengeApi.GetLeaderboard)
	}
}

// InitChallengePrivateRouter 初始化挑战私有路由
func InitChallengePrivateRouter(Router *gin.RouterGroup) {
	challengeRouter := Router.Group("challenge")
	challengeApi := v1.ChallengeApi{}
	{
		challengeRouter.POST("submit", challengeApi.Submit)
		challengeRouter.GET("my-records", challengeApi.GetMyRecords)
	}
}
