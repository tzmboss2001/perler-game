package user

import (
	"errors"
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserApi struct{}

// GetProfile 获取用户信息
func (u *UserApi) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	var user entity.User
	if err := global.GVA_DB.First(&user, userID.(uint)).Error; err != nil {
		response.FailWithMessage("获取用户信息失败", c)
		return
	}

	response.OkWithData(gin.H{
		"id":             user.ID,
		"email":          user.Email,
		"username":       user.Username,
		"nickname":       user.Nickname,
		"avatar":         user.Avatar,
		"phone":          user.Phone,
		"status":         user.Status,
		"email_verified": user.EmailVerified,
		"last_login_at":  user.LastLoginAt,
		"last_login_ip":  user.LastLoginIP,
	}, c)
}

// UpdateProfile 更新用户信息
func (u *UserApi) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	type updateProfileReq struct {
		Nickname string `json:"nickname" binding:"omitempty,max=50"`
		Avatar   string `json:"avatar" binding:"omitempty,max=500"`
	}
	var req updateProfileReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	updates := map[string]interface{}{}
	if req.Nickname != "" {
		updates["nickname"] = req.Nickname
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if len(updates) == 0 {
		response.OkWithMessage("没有可更新的字段", c)
		return
	}

	if err := global.GVA_DB.Model(&entity.User{}).Where("id = ?", userID.(uint)).Updates(updates).Error; err != nil {
		response.FailWithMessage("更新用户信息失败", c)
		return
	}

	response.OkWithMessage("更新成功", c)
}

// GetMember 获取会员信息
func (u *UserApi) GetMember(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	var member entity.UserMember
	if err := global.GVA_DB.Where("user_id = ?", userID.(uint)).First(&member).Error; err != nil {
		response.OkWithData(gin.H{
			"user_id":     userID.(uint),
			"level":       0,
			"is_member":   false,
			"expire_at":   nil,
			"member_name": "普通用户",
		}, c)
		return
	}

	response.OkWithData(gin.H{
		"user_id":     member.UserID,
		"level":       member.Level,
		"is_member":   member.Level > 0,
		"expire_at":   member.ExpireAt,
		"member_name": memberName(member.Level),
	}, c)
}

// GetPreferences 获取用户偏好
func (u *UserApi) GetPreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	var pref entity.UserPreference
	err := global.GVA_DB.Where("user_id = ?", userID.(uint)).First(&pref).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			response.OkWithData(gin.H{"my_color_ids": []string{}}, c)
			return
		}
		response.FailWithMessage("获取用户偏好失败", c)
		return
	}

	ids := []string{}
	if raw, ok := pref.MyColorIDs["ids"]; ok {
		if arr, ok := raw.([]interface{}); ok {
			for _, item := range arr {
				if s, ok := item.(string); ok && s != "" {
					ids = append(ids, s)
				}
			}
		}
	}
	response.OkWithData(gin.H{"my_color_ids": ids}, c)
}

// UpdatePreferences 更新用户偏好
func (u *UserApi) UpdatePreferences(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.FailWithMessage("未登录", c)
		return
	}

	type updatePreferencesReq struct {
		MyColorIDs []string `json:"my_color_ids"`
	}
	var req updatePreferencesReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	pref := entity.UserPreference{
		UserID: userID.(uint),
		MyColorIDs: entity.JSON{
			"ids": req.MyColorIDs,
		},
	}

	if err := global.GVA_DB.Where("user_id = ?", userID.(uint)).Assign(pref).FirstOrCreate(&pref).Error; err != nil {
		response.FailWithMessage("更新用户偏好失败", c)
		return
	}

	response.OkWithMessage("更新成功", c)
}

func memberName(level int) string {
	switch {
	case level >= 3:
		return "SVIP"
	case level == 2:
		return "VIP Pro"
	case level == 1:
		return "VIP"
	default:
		return "普通用户"
	}
}
