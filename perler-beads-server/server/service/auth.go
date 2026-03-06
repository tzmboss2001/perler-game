package service

import (
	"errors"
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/utils"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct{}

var AuthServiceApp = new(AuthService)

// Register 用户注册
func (s *AuthService) Register(req *request.RegisterReq) (uint, error) {
	var existUser entity.User
	if err := global.GVA_DB.Where("email = ?", req.Email).First(&existUser).Error; err == nil {
		return 0, errors.New("该邮箱已注册，请直接登录")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return 0, errors.New("注册遇到问题，请稍后重试")
	}

	user := entity.User{
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Nickname:     req.Nickname,
		Status:       0,
	}
	if user.Nickname == "" {
		user.Nickname = user.Username
	}

	if err := global.GVA_DB.Create(&user).Error; err != nil {
		return 0, err
	}

	member := entity.UserMember{UserID: user.ID, Level: 0}
	global.GVA_DB.Create(&member)

	return user.ID, nil
}

// Login 用户登录
func (s *AuthService) Login(req *request.LoginReq, ip string) (*response.LoginResp, error) {
	var user entity.User
	if err := global.GVA_DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}

	if user.Status != 0 {
		return nil, errors.New("该账号已被禁用，请联系客服")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("密码不正确，请重试")
	}

	j := utils.NewJWT()
	claims := j.CreateClaims(user.ID, user.Username)
	token, err := j.CreateToken(claims)
	if err != nil {
		return nil, errors.New("登录遇到问题，请稍后重试")
	}

	now := time.Now()
	global.GVA_DB.Model(&user).Updates(map[string]interface{}{
		"last_login_at": now,
		"last_login_ip": ip,
	})

	var member entity.UserMember
	global.GVA_DB.Where("user_id = ?", user.ID).First(&member)

	resp := &response.LoginResp{
		Token: token,
		UserInfo: response.UserInfo{
			ID:            user.ID,
			Email:         user.Email,
			Username:      user.Username,
			Nickname:      user.Nickname,
			Avatar:        user.Avatar,
			EmailVerified: user.EmailVerified,
			MemberLevel:   member.Level,
		},
	}
	if member.ExpireAt != nil {
		resp.UserInfo.MemberExpire = member.ExpireAt.Format("2006-01-02")
	}

	return resp, nil
}

// GetUserInfo 获取用户信息
func (s *AuthService) GetUserInfo(userID uint) (*response.UserInfo, error) {
	var user entity.User
	if err := global.GVA_DB.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}

	var member entity.UserMember
	global.GVA_DB.Where("user_id = ?", user.ID).First(&member)

	info := &response.UserInfo{
		ID:            user.ID,
		Email:         user.Email,
		Username:      user.Username,
		Nickname:      user.Nickname,
		Avatar:        user.Avatar,
		EmailVerified: user.EmailVerified,
		MemberLevel:   member.Level,
	}
	if member.ExpireAt != nil {
		info.MemberExpire = member.ExpireAt.Format("2006-01-02")
	}

	return info, nil
}

// ChangePassword 修改密码
func (s *AuthService) ChangePassword(userID uint, req *request.ChangePasswordReq) error {
	var user entity.User
	if err := global.GVA_DB.First(&user, userID).Error; err != nil {
		return errors.New("用户信息获取失败，请重新登录")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("原密码不正确")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("修改密码失败，请稍后重试")
	}

	return global.GVA_DB.Model(&user).Update("password_hash", string(hashedPassword)).Error
}

// UpdateUserInfo 更新用户信息
func (s *AuthService) UpdateUserInfo(userID uint, nickname, avatar string) error {
	updates := make(map[string]interface{})
	if nickname != "" {
		updates["nickname"] = nickname
	}
	if avatar != "" {
		updates["avatar"] = avatar
	}
	if len(updates) == 0 {
		return nil
	}
	return global.GVA_DB.Model(&entity.User{}).Where("id = ?", userID).Updates(updates).Error
}

// SmartLogin 智能登录（邮箱不存在时自动注册）
func (s *AuthService) SmartLogin(req *request.SmartLoginReq, ip string) (*response.LoginResp, bool, error) {
	var user entity.User
	isNewUser := false

	err := global.GVA_DB.Where("email = ?", req.Email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			username := req.Email[:findAtIndex(req.Email)]
			hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
			if hashErr != nil {
				return nil, false, errors.New("注册遇到问题，请稍后重试")
			}

			user = entity.User{
				Email:        req.Email,
				Username:     username,
				PasswordHash: string(hashedPassword),
				Nickname:     username,
				Status:       0,
			}
			if createErr := global.GVA_DB.Create(&user).Error; createErr != nil {
				return nil, false, errors.New("注册遇到问题，请稍后重试")
			}

			member := entity.UserMember{UserID: user.ID, Level: 0}
			global.GVA_DB.Create(&member)
			isNewUser = true
		} else {
			return nil, false, err
		}
	} else {
		if user.Status != 0 {
			return nil, false, errors.New("该账号已被禁用，请联系客服")
		}
		if pwdErr := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); pwdErr != nil {
			return nil, false, errors.New("密码不正确，请重试")
		}
	}

	j := utils.NewJWT()
	claims := j.CreateClaims(user.ID, user.Username)
	token, err := j.CreateToken(claims)
	if err != nil {
		return nil, false, errors.New("登录遇到问题，请稍后重试")
	}

	now := time.Now()
	global.GVA_DB.Model(&user).Updates(map[string]interface{}{
		"last_login_at": now,
		"last_login_ip": ip,
	})

	var member entity.UserMember
	global.GVA_DB.Where("user_id = ?", user.ID).First(&member)

	resp := &response.LoginResp{
		Token: token,
		UserInfo: response.UserInfo{
			ID:            user.ID,
			Email:         user.Email,
			Username:      user.Username,
			Nickname:      user.Nickname,
			Avatar:        user.Avatar,
			EmailVerified: user.EmailVerified,
			MemberLevel:   member.Level,
		},
	}
	if member.ExpireAt != nil {
		resp.UserInfo.MemberExpire = member.ExpireAt.Format("2006-01-02")
	}

	return resp, isNewUser, nil
}

func findAtIndex(email string) int {
	for i, c := range email {
		if c == '@' {
			return i
		}
	}
	return len(email)
}

// DeleteAccount 注销账号
func (s *AuthService) DeleteAccount(userID uint) error {
	tx := global.GVA_DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Where("user_id = ?", userID).Delete(&entity.Project{}).Error; err != nil {
		tx.Rollback()
		return errors.New("注销失败，请稍后重试")
	}
	if err := tx.Where("user_id = ?", userID).Delete(&entity.UserMember{}).Error; err != nil {
		tx.Rollback()
		return errors.New("注销失败，请稍后重试")
	}
	if err := tx.Where("user_id = ?", userID).Delete(&entity.UserPreference{}).Error; err != nil {
		tx.Rollback()
		return errors.New("注销失败，请稍后重试")
	}
	if err := tx.Delete(&entity.User{}, userID).Error; err != nil {
		tx.Rollback()
		return errors.New("注销失败，请稍后重试")
	}
	if err := tx.Commit().Error; err != nil {
		return errors.New("注销失败，请稍后重试")
	}

	return nil
}
