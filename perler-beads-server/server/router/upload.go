package router

import (
	v1 "perler-beads-server/api/v1/upload"

	"github.com/gin-gonic/gin"
)

// InitUploadRouter 初始化上传路由
func InitUploadRouter(Router *gin.RouterGroup) {
	uploadRouter := Router.Group("upload")
	uploadApi := v1.UploadApi{}
	{
		uploadRouter.POST("image", uploadApi.UploadImage)       // 上传单张图片
		uploadRouter.POST("multiple", uploadApi.UploadMultiple) // 批量上传图片
	}
}
