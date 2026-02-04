package template

import (
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/service"
	"strconv"

	"github.com/gin-gonic/gin"
)

type TemplateApi struct{}

var templateService = service.TemplateService{}

// GetList 获取模板列表
// @Tags     Template
// @Summary  获取模板列表
// @Produce  application/json
// @Param    category_id query int false "分类ID"
// @Param    is_featured query bool false "是否精选"
// @Param    difficulty query string false "难度"
// @Param    keyword query string false "搜索关键词"
// @Param    page query int false "页码"
// @Param    pageSize query int false "每页数量"
// @Success  200 {object} response.Response{data=response.PageResult} "获取成功"
// @Router   /template/list [get]
func (t *TemplateApi) GetList(c *gin.Context) {
	var req request.TemplateListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	// 默认分页
	if req.Page == 0 {
		req.Page = 1
	}
	if req.PageSize == 0 {
		req.PageSize = 20
	}

	list, total, err := templateService.GetTemplateList(&req)
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

// GetFeatured 获取精选模板（首页用）
// @Tags     Template
// @Summary  获取精选模板
// @Produce  application/json
// @Param    limit query int false "数量限制，默认5"
// @Success  200 {object} response.Response{data=[]response.FeaturedTemplateResponse} "获取成功"
// @Router   /template/featured [get]
func (t *TemplateApi) GetFeatured(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "5")
	limit, _ := strconv.Atoi(limitStr)
	if limit <= 0 || limit > 20 {
		limit = 5
	}

	list, err := templateService.GetFeaturedTemplates(limit)
	if err != nil {
		response.FailWithMessage("获取失败: "+err.Error(), c)
		return
	}

	response.OkWithData(list, c)
}

// GetCategories 获取模板分类
// @Tags     Template
// @Summary  获取模板分类
// @Produce  application/json
// @Success  200 {object} response.Response{data=[]response.CategoryResponse} "获取成功"
// @Router   /template/categories [get]
func (t *TemplateApi) GetCategories(c *gin.Context) {
	list, err := templateService.GetCategoryList()
	if err != nil {
		response.FailWithMessage("获取失败: "+err.Error(), c)
		return
	}

	response.OkWithData(list, c)
}

// GetById 获取模板详情
// @Tags     Template
// @Summary  获取模板详情
// @Produce  application/json
// @Param    id path int true "模板ID"
// @Success  200 {object} response.Response{data=response.TemplateResponse} "获取成功"
// @Router   /template/{id} [get]
func (t *TemplateApi) GetById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的模板ID", c)
		return
	}

	template, err := templateService.GetTemplateByID(uint(id))
	if err != nil {
		response.FailWithMessage("模板不存在", c)
		return
	}

	response.OkWithData(template, c)
}

// UseTemplate 使用模板
// @Tags     Template
// @Summary  使用模板
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    id path int true "模板ID"
// @Success  200 {object} response.Response{data=response.TemplateResponse} "使用成功"
// @Router   /template/{id}/use [post]
func (t *TemplateApi) UseTemplate(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的模板ID", c)
		return
	}

	// 获取模板详情
	template, err := templateService.GetTemplateByID(uint(id))
	if err != nil {
		response.FailWithMessage("模板不存在", c)
		return
	}

	// 增加使用次数
	_ = templateService.IncrementUseCount(uint(id))

	response.OkWithData(template, c)
}

// ========== 管理接口（需要管理员权限） ==========

// Create 创建模板
// @Tags     Template
// @Summary  创建模板
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    data body request.CreateTemplateRequest true "模板信息"
// @Success  200 {object} response.Response{data=object} "创建成功"
// @Router   /template/create [post]
func (t *TemplateApi) Create(c *gin.Context) {
	var req request.CreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	template, err := templateService.CreateTemplate(&req)
	if err != nil {
		response.FailWithMessage("创建失败: "+err.Error(), c)
		return
	}

	response.OkWithData(template, c)
}

// Update 更新模板
// @Tags     Template
// @Summary  更新模板
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    id path int true "模板ID"
// @Param    data body request.UpdateTemplateRequest true "模板信息"
// @Success  200 {object} response.Response{msg=string} "更新成功"
// @Router   /template/{id} [put]
func (t *TemplateApi) Update(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的模板ID", c)
		return
	}

	var req request.UpdateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	if err := templateService.UpdateTemplate(uint(id), &req); err != nil {
		response.FailWithMessage("更新失败: "+err.Error(), c)
		return
	}

	response.OkWithMessage("更新成功", c)
}

// Delete 删除模板
// @Tags     Template
// @Summary  删除模板
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    id path int true "模板ID"
// @Success  200 {object} response.Response{msg=string} "删除成功"
// @Router   /template/{id} [delete]
func (t *TemplateApi) Delete(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的模板ID", c)
		return
	}

	if err := templateService.DeleteTemplate(uint(id)); err != nil {
		response.FailWithMessage("删除失败: "+err.Error(), c)
		return
	}

	response.OkWithMessage("删除成功", c)
}

// CreateCategory 创建分类
// @Tags     Template
// @Summary  创建分类
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    data body request.CreateCategoryRequest true "分类信息"
// @Success  200 {object} response.Response{data=object} "创建成功"
// @Router   /template/category/create [post]
func (t *TemplateApi) CreateCategory(c *gin.Context) {
	var req request.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	category, err := templateService.CreateCategory(&req)
	if err != nil {
		response.FailWithMessage("创建失败: "+err.Error(), c)
		return
	}

	response.OkWithData(category, c)
}

// UpdateCategory 更新分类
// @Tags     Template
// @Summary  更新分类
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    id path int true "分类ID"
// @Param    data body request.UpdateCategoryRequest true "分类信息"
// @Success  200 {object} response.Response{msg=string} "更新成功"
// @Router   /template/category/{id} [put]
func (t *TemplateApi) UpdateCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的分类ID", c)
		return
	}

	var req request.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	if err := templateService.UpdateCategory(uint(id), &req); err != nil {
		response.FailWithMessage("更新失败: "+err.Error(), c)
		return
	}

	response.OkWithMessage("更新成功", c)
}

// DeleteCategory 删除分类
// @Tags     Template
// @Summary  删除分类
// @Security ApiKeyAuth
// @Produce  application/json
// @Param    id path int true "分类ID"
// @Success  200 {object} response.Response{msg=string} "删除成功"
// @Router   /template/category/{id} [delete]
func (t *TemplateApi) DeleteCategory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("无效的分类ID", c)
		return
	}

	if err := templateService.DeleteCategory(uint(id)); err != nil {
		response.FailWithMessage("删除失败: "+err.Error(), c)
		return
	}

	response.OkWithMessage("删除成功", c)
}
