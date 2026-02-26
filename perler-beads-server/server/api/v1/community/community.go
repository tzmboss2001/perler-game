package community

import (
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/service"
	"strconv"

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
// @Param    data body object true "作品信息"
// @Success  200 {object} response.Response{data=object} "发布成功"
// @Router   /community/posts [post]
func (co *CommunityApi) CreatePost(c *gin.Context) {
	// Phase 2 实现
	response.OkWithMessage("发布作品接口待实现", c)
}

// LikePost 点赞
// @Tags     Community
// @Summary  点赞
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Success  200 {object} response.Response{msg=string} "点赞成功"
// @Router   /community/posts/{id}/like [post]
func (co *CommunityApi) LikePost(c *gin.Context) {
	// Phase 2 实现
	response.OkWithMessage("点赞接口待实现", c)
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
	// Phase 2 实现
	response.OkWithMessage("评论接口待实现", c)
}
