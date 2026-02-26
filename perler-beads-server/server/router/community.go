package router

import (
	v1 "perler-beads-server/api/v1/community"

	"github.com/gin-gonic/gin"
)

// InitCommunityPublicRouter 初始化社区公开路由
func InitCommunityPublicRouter(Router *gin.RouterGroup) {
	communityRouter := Router.Group("community")
	communityApi := v1.CommunityApi{}
	{
		communityRouter.GET("posts", communityApi.GetPosts)          // 作品列表
		communityRouter.GET("posts/:id", communityApi.GetPost)       // 作品详情
		communityRouter.POST("posts/:id/make", communityApi.MakePost) // 增加制作次数
	}
}

// InitCommunityRouter 初始化社区私有路由
func InitCommunityRouter(Router *gin.RouterGroup) {
	communityRouter := Router.Group("community")
	communityApi := v1.CommunityApi{}
	{
		communityRouter.POST("posts", communityApi.CreatePost)         // 发布作品
		communityRouter.POST("posts/:id/like", communityApi.LikePost)  // 点赞
		communityRouter.POST("posts/:id/comment", communityApi.Comment) // 评论
	}
}
