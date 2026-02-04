package router

import (
	v1 "perler-beads-server/api/v1/template"

	"github.com/gin-gonic/gin"
)

// InitTemplatePublicRouter 初始化模板公开路由
func InitTemplatePublicRouter(Router *gin.RouterGroup) {
	templateRouter := Router.Group("template")
	templateApi := v1.TemplateApi{}
	{
		templateRouter.GET("list", templateApi.GetList)             // 模板列表
		templateRouter.GET("featured", templateApi.GetFeatured)     // 精选模板（首页用）
		templateRouter.GET("categories", templateApi.GetCategories) // 模板分类
		templateRouter.GET(":id", templateApi.GetById)              // 模板详情
	}
}

// InitTemplateRouter 初始化模板私有路由（需要登录）
func InitTemplateRouter(Router *gin.RouterGroup) {
	templateRouter := Router.Group("template")
	templateApi := v1.TemplateApi{}
	{
		templateRouter.POST(":id/use", templateApi.UseTemplate) // 使用模板
	}
}

// InitTemplateAdminRouter 初始化模板管理路由（需要管理员权限）
// 注意：实际使用时需要添加管理员中间件
func InitTemplateAdminRouter(Router *gin.RouterGroup) {
	templateRouter := Router.Group("template")
	templateApi := v1.TemplateApi{}
	{
		// 模板管理
		templateRouter.POST("create", templateApi.Create)    // 创建模板
		templateRouter.PUT(":id", templateApi.Update)        // 更新模板
		templateRouter.DELETE(":id", templateApi.Delete)     // 删除模板

		// 分类管理
		templateRouter.POST("category/create", templateApi.CreateCategory)    // 创建分类
		templateRouter.PUT("category/:id", templateApi.UpdateCategory)        // 更新分类
		templateRouter.DELETE("category/:id", templateApi.DeleteCategory)     // 删除分类
	}
}
