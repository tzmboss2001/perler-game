package router

import (
	v1 "perler-game-server/api/v1/achievement"

	"github.com/gin-gonic/gin"
)

// InitAchievementRouter 初始化成就私有路由
func InitAchievementRouter(Router *gin.RouterGroup) {
	achievementRouter := Router.Group("achievement")
	achievementApi := v1.AchievementApi{}
	{
		achievementRouter.GET("my", achievementApi.GetMyAchievements)
		achievementRouter.POST("unlock", achievementApi.Unlock)
		achievementRouter.GET("stats", achievementApi.GetMyStats)
		achievementRouter.POST("stats/update", achievementApi.UpdateStats)
	}
}
