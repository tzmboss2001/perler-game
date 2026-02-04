package feedback

import (
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/service"

	"github.com/gin-gonic/gin"
)

type FeedbackApi struct{}

// Create 提交反馈
// @Tags     Feedback
// @Summary  提交用户反馈
// @accept   application/json
// @Produce  application/json
// @Param    data body request.CreateFeedbackReq true "反馈参数"
// @Success  200 {object} response.Response "提交成功"
// @Router   /feedback/create [post]
func (a *FeedbackApi) Create(c *gin.Context) {
	var req request.CreateFeedbackReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	// 获取用户ID（可选，未登录用户也可以提交）
	var userID *uint
	if id, exists := c.Get("userID"); exists {
		uid := id.(uint)
		userID = &uid
	}

	// 获取客户端信息
	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	if err := service.FeedbackServiceApp.Create(&req, userID, ip, userAgent); err != nil {
		response.FailWithMessage("提交失败，请稍后重试", c)
		return
	}

	response.OkWithMessage("感谢您的反馈，我们会认真阅读！", c)
}
