package user

import (
	"perler-beads-server/model/response"

	"github.com/gin-gonic/gin"
)

type UserApi struct{}

// GetProfile 获取用户信息
// @Tags     User
// @Summary  获取用户信息
// @Security ApiKeyAuth
// @Produce  application/json
// @Success  200 {object} response.Response{data=object} "获取成功"
// @Router   /user/profile [get]
func (u *UserApi) GetProfile(c *gin.Context) {
	// TODO: 实现获取用户信息逻辑
	response.OkWithMessage("获取用户信息接口待实现", c)
}

// UpdateProfile 更新用户信息
// @Tags     User
// @Summary  更新用户信息
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    data body object true "用户信息"
// @Success  200 {object} response.Response{msg=string} "更新成功"
// @Router   /user/profile [put]
func (u *UserApi) UpdateProfile(c *gin.Context) {
	// TODO: 实现更新用户信息逻辑
	response.OkWithMessage("更新用户信息接口待实现", c)
}

// GetMember 获取会员信息
// @Tags     User
// @Summary  获取会员信息
// @Security ApiKeyAuth
// @Produce  application/json
// @Success  200 {object} response.Response{data=object} "获取成功"
// @Router   /user/member [get]
func (u *UserApi) GetMember(c *gin.Context) {
	// TODO: 实现获取会员信息逻辑
	response.OkWithMessage("获取会员信息接口待实现", c)
}
