package gallery

import (
	"perler-game-server/model/request"
	"perler-game-server/model/response"
	"perler-game-server/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type GalleryApi struct{}

// List 广场作品列表
func (a *GalleryApi) List(c *gin.Context) {
	var req request.GalleryListReq
	req.Page, _ = strconv.Atoi(c.DefaultQuery("page", "1"))
	req.PageSize, _ = strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	req.Sort = c.DefaultQuery("sort", "latest")

	result, err := service.GalleryServiceApp.List(&req)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(result, c)
}

// GetDetail 查看作品详情
func (a *GalleryApi) GetDetail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.FailWithMessage("参数错误", c)
		return
	}

	var currentUserID uint
	if uid, exists := c.Get("userID"); exists {
		currentUserID = uid.(uint)
	}

	result, err := service.GalleryServiceApp.GetDetail(uint(id), currentUserID)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(result, c)
}

// ToggleLike 点赞/取消点赞
func (a *GalleryApi) ToggleLike(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.FailWithMessage("参数错误", c)
		return
	}

	liked, err := service.GalleryServiceApp.ToggleLike(userID.(uint), uint(id))
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	msg := "已点赞"
	if !liked {
		msg = "已取消点赞"
	}

	response.OkWithDetailed(gin.H{"liked": liked}, msg, c)
}

// GetComments 获取评论列表
func (a *GalleryApi) GetComments(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.FailWithMessage("参数错误", c)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	result, err := service.GalleryServiceApp.GetComments(uint(id), page, pageSize)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(result, c)
}

// PostComment 发表评论
func (a *GalleryApi) PostComment(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.FailWithMessage("参数错误", c)
		return
	}

	var req request.CommentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	if err := service.GalleryServiceApp.PostComment(userID.(uint), uint(id), req.Content); err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithMessage("评论成功", c)
}

// GetLeaderboard 翻车排行榜
func (a *GalleryApi) GetLeaderboard(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	items, err := service.GalleryServiceApp.GetLeaderboard(limit)
	if err != nil {
		response.FailWithMessage(err.Error(), c)
		return
	}

	response.OkWithData(items, c)
}
