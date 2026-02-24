package challenge

import (
	"perler-game-server/model/request"
	"perler-game-server/model/response"
	"perler-game-server/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ChallengeApi struct{}

// GetDaily 获取今日挑战
func (a *ChallengeApi) GetDaily(c *gin.Context) {
	items, err := service.ChallengeServiceApp.GetDailyChallenges()
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}
	response.OkWithData(items, c)
}

// GetWeekly 获取本周挑战
func (a *ChallengeApi) GetWeekly(c *gin.Context) {
	items, err := service.ChallengeServiceApp.GetWeeklyChallenges()
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}
	response.OkWithData(items, c)
}

// Submit 提交挑战结果
func (a *ChallengeApi) Submit(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	var req request.ChallengeSubmitReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	if err := service.ChallengeServiceApp.Submit(userID.(uint), &req); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithMessage("提交成功", c)
}

// GetLeaderboard 挑战排行榜
func (a *ChallengeApi) GetLeaderboard(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.FailWithMessage("参数错误", c)
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	entries, err := service.ChallengeServiceApp.GetLeaderboard(uint(id), limit)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(entries, c)
}

// GetMyRecords 我的挑战记录
func (a *ChallengeApi) GetMyRecords(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	result, err := service.ChallengeServiceApp.GetMyRecords(userID.(uint), page, pageSize)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(result, c)
}
