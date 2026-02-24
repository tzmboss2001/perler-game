package router

import (
	v1 "perler-game-server/api/v1/gallery"

	"github.com/gin-gonic/gin"
)

// InitGalleryPublicRouter 初始化广场公开路由
func InitGalleryPublicRouter(Router *gin.RouterGroup) {
	galleryRouter := Router.Group("gallery")
	galleryApi := v1.GalleryApi{}
	{
		galleryRouter.GET("list", galleryApi.List)
		galleryRouter.GET("leaderboard", galleryApi.GetLeaderboard)
		galleryRouter.GET(":id/comments", galleryApi.GetComments)
	}
}

// InitGalleryOptionalAuthRouter 初始化广场可选认证路由
func InitGalleryOptionalAuthRouter(Router *gin.RouterGroup) {
	galleryRouter := Router.Group("gallery")
	galleryApi := v1.GalleryApi{}
	{
		galleryRouter.GET(":id", galleryApi.GetDetail)
	}
}

// InitGalleryPrivateRouter 初始化广场私有路由
func InitGalleryPrivateRouter(Router *gin.RouterGroup) {
	galleryRouter := Router.Group("gallery")
	galleryApi := v1.GalleryApi{}
	{
		galleryRouter.POST(":id/like", galleryApi.ToggleLike)
		galleryRouter.POST(":id/comment", galleryApi.PostComment)
	}
}
