package achievement

import (
	"perler-game-server/model/request"
	"perler-game-server/model/response"
	"perler-game-server/service"

	"github.com/gin-gonic/gin"
)

type AchievementApi struct{}

// GetMyAchievements 获取我的已解锁成就
func (a *AchievementApi) GetMyAchievements(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	items, err := service.AchievementServiceApp.GetMyAchievements(userID.(uint))
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(items, c)
}

// Unlock 解锁成就
func (a *AchievementApi) Unlock(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	var req request.AchievementUnlockReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	if err := service.AchievementServiceApp.UnlockAchievement(userID.(uint), req.AchievementID); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithMessage("解锁成功", c)
}

// GetMyStats 获取我的统计数据
func (a *AchievementApi) GetMyStats(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	stats, err := service.AchievementServiceApp.GetMyStats(userID.(uint))
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(stats, c)
}

// UpdateStats 更新统计数据
func (a *AchievementApi) UpdateStats(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	var req request.StatsUpdateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	if err := service.AchievementServiceApp.UpdateStats(userID.(uint), &req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithMessage("更新成功", c)
}
