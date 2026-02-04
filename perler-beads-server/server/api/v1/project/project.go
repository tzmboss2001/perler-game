package project

import (
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/service"
	"perler-beads-server/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ProjectApi struct{}

var projectService = service.ProjectServiceApp

// Create 创建作品
// @Tags     Project
// @Summary  创建作品
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    data body request.CreateProjectReq true "作品信息"
// @Success  200 {object} response.Response{data=object} "创建成功"
// @Router   /project/create [post]
func (p *ProjectApi) Create(c *gin.Context) {
	var req request.CreateProjectReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	// 获取用户ID（必须登录）
	userID := getUserID(c)

	// 必须登录才能创建作品
	if userID == 0 {
		response.FailWithMessage("请先登录后再保存作品", c)
		return
	}

	id, err := projectService.Create(&req, userID)
	if err != nil {
		response.FailWithMessage("创建失败: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(map[string]interface{}{
		"id": id,
	}, "创建成功", c)
}

// GetList 获取作品列表
// @Tags     Project
// @Summary  获取作品列表
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    page query int false "页码"
// @Param    pageSize query int false "每页数量"
// @Param    device_id query string false "设备ID"
// @Param    status query int false "状态"
// @Success  200 {object} response.Response{data=response.PageResult} "获取成功"
// @Router   /project/list [get]
func (p *ProjectApi) GetList(c *gin.Context) {
	var req request.ProjectListReq
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	// 默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 || req.PageSize > 50 {
		req.PageSize = 20
	}

	userID := getUserID(c)

	list, total, err := projectService.GetList(&req, userID)
	if err != nil {
		response.FailWithMessage("获取失败: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "获取成功", c)
}

// GetById 获取作品详情
// @Tags     Project
// @Summary  获取作品详情
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Param    device_id query string false "设备ID"
// @Success  200 {object} response.Response{data=response.ProjectDetail} "获取成功"
// @Router   /project/{id} [get]
func (p *ProjectApi) GetById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的ID", c)
		return
	}

	userID := getUserID(c)
	deviceID := c.Query("device_id")

	detail, err := projectService.GetByID(uint(id), userID, deviceID)
	if err != nil {
		response.FailWithMessage("获取失败: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(detail, "获取成功", c)
}

// Update 更新作品
// @Tags     Project
// @Summary  更新作品
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Param    data body request.UpdateProjectReq true "作品信息"
// @Success  200 {object} response.Response{msg=string} "更新成功"
// @Router   /project/{id} [put]
func (p *ProjectApi) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的ID", c)
		return
	}

	var req request.UpdateProjectReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	userID := getUserID(c)
	deviceID := c.Query("device_id")

	if err := projectService.Update(uint(id), &req, userID, deviceID); err != nil {
		response.FailWithMessage("更新失败: "+err.Error(), c)
		return
	}

	response.OkWithMessage("更新成功", c)
}

// Delete 删除作品
// @Tags     Project
// @Summary  删除作品
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Param    device_id query string false "设备ID"
// @Success  200 {object} response.Response{msg=string} "删除成功"
// @Router   /project/{id} [delete]
func (p *ProjectApi) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的ID", c)
		return
	}

	userID := getUserID(c)
	deviceID := c.Query("device_id")

	if err := projectService.Delete(uint(id), userID, deviceID); err != nil {
		response.FailWithMessage("删除失败: "+err.Error(), c)
		return
	}

	response.OkWithMessage("删除成功", c)
}

// UpdateProgress 更新制作进度
// @Tags     Project
// @Summary  更新制作进度
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    id path int true "作品ID"
// @Param    data body request.UpdateProgressReq true "进度信息"
// @Success  200 {object} response.Response{msg=string} "更新成功"
// @Router   /project/{id}/progress [put]
func (p *ProjectApi) UpdateProgress(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的ID", c)
		return
	}

	var req request.UpdateProgressReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	userID := getUserID(c)
	deviceID := c.Query("device_id")

	if err := projectService.UpdateProgress(uint(id), &req, userID, deviceID); err != nil {
		response.FailWithMessage("更新失败: "+err.Error(), c)
		return
	}

	response.OkWithMessage("更新成功", c)
}

// getUserID 从上下文获取用户ID
func getUserID(c *gin.Context) uint {
	// 首先尝试从上下文获取（JWT中间件已解析）
	if userID, exists := c.Get("userID"); exists {
		if id, ok := userID.(uint); ok && id > 0 {
			return id
		}
	}

	// 如果上下文没有（公开路由），尝试从 header 手动解析 JWT
	token := c.Request.Header.Get("x-token")
	if token == "" {
		return 0
	}

	// 解析 Token
	j := utils.NewJWT()
	claims, err := j.ParseToken(token)
	if err != nil {
		return 0
	}

	return claims.UserID
}
