package initialize

import (
	"perler-beads-server/middleware"
	"perler-beads-server/router"

	"github.com/gin-gonic/gin"
)

// Routers 初始化路由
func Routers() *gin.Engine {
	r := gin.Default()

	// 全局中间件
	r.Use(middleware.Cors())

	// API 路由组
	publicGroup := r.Group("/api/v1")
	privateGroup := r.Group("/api/v1")
	privateGroup.Use(middleware.JWTAuth())

	// 注册路由
	{
		// 公开路由（无需登录）
		router.InitAuthRouter(publicGroup)
		router.InitBeadRouter(publicGroup)
		router.InitTemplatePublicRouter(publicGroup)
		router.InitCommunityPublicRouter(publicGroup)
		router.InitProjectRouter(publicGroup)  // 支持游客模式，使用 DeviceID 验证
		router.InitUploadRouter(publicGroup)   // 图片上传
		router.InitFeedbackRouter(publicGroup) // 意见反馈（无需登录也可提交）
	}
	{
		// 私有路由（需要登录）
		router.InitAuthPrivateRouter(privateGroup)    // 认证相关私有路由
		router.InitUserRouter(privateGroup)
		router.InitTemplateRouter(privateGroup)
		router.InitTemplateAdminRouter(privateGroup)  // 模板管理路由（暂时放在私有路由，后续可加管理员验证）
		router.InitCommunityRouter(privateGroup)
		router.InitPaymentRouter(privateGroup)
		router.InitProjectPrivateRouter(privateGroup) // 作品相关私有路由（创建、更新、删除）
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "perler-beads-server",
		})
	})

	return r
}
