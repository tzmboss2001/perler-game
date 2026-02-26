package community

import (
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/service"
	"perler-beads-server/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type CommunityApi struct{}

var communityService = service.CommunityService{}

// GetPosts 获取社区作品列表
// @Tags     Community
// @Summary  获取社区作品列表
// @Produce  application/json
// @Param    page query int false "页码"
// @Param    pageSize query int false "每页数量"
// @Success  200 {object} response.Response{data=response.PageResult} "获取成功"
// @Router   /community/posts [get]
func (co *CommunityApi) GetPosts(c *gin.Context) {
	var req request.CommunityPostListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("参数错误", c)
		return
	}

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	list, total, err := communityService.GetPosts(&req)
	if err != nil {
		response.FailWithMessage("获取社区作品列表失败", c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "获取成功", c)
}

// GetPost 获取作品详情
// @Tags     Community
// @Summary  获取作品详情
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Success  200 {object} response.Response{data=response.CommunityPostDetail} "获取成功"
// @Router   /community/posts/{id} [get]
func (co *CommunityApi) GetPost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的作品ID", c)
		return
	}

	detail, err := communityService.GetPostByID(uint(id))
	if err != nil {
		response.FailWithMessage("获取作品详情失败", c)
		return
	}
	if detail == nil {
		response.FailWithMessage("作品不存在或已下架", c)
		return
	}

	// 尝试从 Header 读取 token，解析 userID（不强制要求）
	userID := tryGetUserID(c)
	if userID > 0 {
		detail.Liked = communityService.IsLiked(userID, uint(id))
	}

	response.OkWithDetailed(detail, "获取成功", c)
}

// MakePost 增加制作次数
// @Tags     Community
// @Summary  增加制作次数
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Success  200 {object} response.Response{msg=string} "操作成功"
// @Router   /community/posts/{id}/make [post]
func (co *CommunityApi) MakePost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的作品ID", c)
		return
	}

	if err := communityService.IncrementMakeCount(uint(id)); err != nil {
		response.FailWithMessage("操作失败", c)
		return
	}

	response.OkWithMessage("操作成功", c)
}

// CreatePost 发布作品
// @Tags     Community
// @Summary  发布作品
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    data body request.CreateCommunityPostRequest true "作品信息"
// @Success  200 {object} response.Response{data=object} "发布成功"
// @Router   /community/posts [post]
func (co *CommunityApi) CreatePost(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("未登录", c)
		return
	}

	var req request.CreateCommunityPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	post, err := communityService.CreatePost(&req, userID)
	if err != nil {
		response.FailWithMessage("发布失败: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(gin.H{
		"id":            post.ID,
		"title":         post.Title,
		"thumbnail_url": post.ThumbnailURL,
	}, "发布成功", c)
}

// LikePost 点赞/取消点赞
// @Tags     Community
// @Summary  点赞/取消点赞
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Success  200 {object} response.Response{data=response.LikeResponse} "操作成功"
// @Router   /community/posts/{id}/like [post]
func (co *CommunityApi) LikePost(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("未登录", c)
		return
	}

	idStr := c.Param("id")
	postID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的作品ID", c)
		return
	}

	result, err := communityService.ToggleLike(userID, uint(postID))
	if err != nil {
		response.FailWithMessage("操作失败", c)
		return
	}

	response.OkWithDetailed(result, "操作成功", c)
}

// Comment 评论
// @Tags     Community
// @Summary  评论
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Param    data body object true "评论内容"
// @Success  200 {object} response.Response{msg=string} "评论成功"
// @Router   /community/posts/{id}/comment [post]
func (co *CommunityApi) Comment(c *gin.Context) {
	// Phase 3 实现
	response.OkWithMessage("评论接口待实现", c)
}

// tryGetUserID 尝试从 Header 读取 token 解析 userID（不强制）
func tryGetUserID(c *gin.Context) uint {
	token := c.Request.Header.Get("Authorization")
	if token == "" {
		token = c.Request.Header.Get("x-token")
	}
	if token == "" {
		return 0
	}
	if strings.HasPrefix(token, "Bearer ") {
		token = token[7:]
	}
	j := utils.NewJWT()
	claims, err := j.ParseToken(token)
	if err != nil {
		return 0
	}
	return claims.UserID
}
