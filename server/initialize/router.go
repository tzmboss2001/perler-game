package initialize

import (
	"perler-game-server/middleware"
	"perler-game-server/router"

	"github.com/gin-gonic/gin"
)

// Routers 初始化路由
func Routers() *gin.Engine {
	r := gin.Default()

	// 全局中间件
	r.Use(middleware.Cors())

	// API 路由组
	publicGroup := r.Group("/api/v1")
	optionalAuthGroup := r.Group("/api/v1")
	optionalAuthGroup.Use(middleware.OptionalAuth())
	privateGroup := r.Group("/api/v1")
	privateGroup.Use(middleware.JWTAuth())

	// 注册路由
	{
		// 公开路由（无需登录）
		router.InitAuthPublicRouter(publicGroup)
		router.InitGalleryPublicRouter(publicGroup)
		router.InitChallengePublicRouter(publicGroup)
	}
	{
		// 可选认证路由（有token解析用户，无token也可访问）
		router.InitGalleryOptionalAuthRouter(optionalAuthGroup)
	}
	{
		// 私有路由（需要登录）
		router.InitAuthPrivateRouter(privateGroup)
		router.InitWorkRouter(privateGroup)
		router.InitGalleryPrivateRouter(privateGroup)
		router.InitAchievementRouter(privateGroup)
		router.InitChallengePrivateRouter(privateGroup)
	}

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "perler-game-server",
		})
	})

	return r
}
