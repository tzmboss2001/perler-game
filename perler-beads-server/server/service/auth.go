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
	// 检查邮箱是否已存在
	var existUser entity.User
	if err := global.GVA_DB.Where("email = ?", req.Email).First(&existUser).Error; err == nil {
		return 0, errors.New("该邮箱已注册，请直接登录")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, err
	}

	// 密码加密
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return 0, errors.New("注册遇到问题，请稍后重试")
	}

	// 创建用户
	user := entity.User{
		Email:        req.Email,
		Username:     req.Username,
		PasswordHash: string(hashedPassword),
		Nickname:     req.Nickname,
		Status:       0, // 正常状态
	}

	// 如果没有提供昵称，使用用户名作为昵称
	if user.Nickname == "" {
		user.Nickname = user.Username
	}

	if err := global.GVA_DB.Create(&user).Error; err != nil {
		return 0, err
	}

	// 创建用户会员信息（默认普通用户）
	member := entity.UserMember{
		UserID: user.ID,
		Level:  0, // 普通用户
	}
	global.GVA_DB.Create(&member)

	return user.ID, nil
}

// Login 用户登录
func (s *AuthService) Login(req *request.LoginReq, ip string) (*response.LoginResp, error) {
	var user entity.User

	// 查找用户
	if err := global.GVA_DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}

	// 检查用户状态
	if user.Status != 0 {
		return nil, errors.New("该账户已被冻结，如有疑问请联系客服")
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("密码不正确，请检查后重试")
	}

	// 生成 Token
	j := utils.NewJWT()
	claims := j.CreateClaims(user.ID, user.Username)
	token, err := j.CreateToken(claims)
	if err != nil {
		return nil, errors.New("登录遇到问题，请稍后重试")
	}

	// 更新最后登录信息
	now := time.Now()
	global.GVA_DB.Model(&user).Updates(map[string]interface{}{
		"last_login_at": now,
		"last_login_ip": ip,
	})

	// 获取会员信息
	var member entity.UserMember
	global.GVA_DB.Where("user_id = ?", user.ID).First(&member)

	// 构建响应
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

	// 会员过期时间
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

	// 获取会员信息
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

	// 验证旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("原密码不正确，请检查后重试")
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("修改密码遇到问题，请稍后重试")
	}

	// 更新密码
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

	// 查找用户
	err := global.GVA_DB.Where("email = ?", req.Email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 用户不存在，自动注册
			// 从邮箱提取用户名（@ 前面的部分）
			username := req.Email[:findAtIndex(req.Email)]

			// 密码加密
			hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
			if hashErr != nil {
				return nil, false, errors.New("注册遇到问题，请稍后重试")
			}

			// 创建用户
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

			// 创建用户会员信息
			member := entity.UserMember{
				UserID: user.ID,
				Level:  0,
			}
			global.GVA_DB.Create(&member)

			isNewUser = true
		} else {
			return nil, false, err
		}
	} else {
		// 用户存在，验证密码
		if user.Status != 0 {
			return nil, false, errors.New("该账户已被冻结，如有疑问请联系客服")
		}

		if pwdErr := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); pwdErr != nil {
			return nil, false, errors.New("密码不正确，请检查后重试")
		}
	}

	// 生成 Token
	j := utils.NewJWT()
	claims := j.CreateClaims(user.ID, user.Username)
	token, err := j.CreateToken(claims)
	if err != nil {
		return nil, false, errors.New("登录遇到问题，请稍后重试")
	}

	// 更新最后登录信息
	now := time.Now()
	global.GVA_DB.Model(&user).Updates(map[string]interface{}{
		"last_login_at": now,
		"last_login_ip": ip,
	})

	// 获取会员信息
	var member entity.UserMember
	global.GVA_DB.Where("user_id = ?", user.ID).First(&member)

	// 构建响应
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

// findAtIndex 找到 @ 符号的位置
func findAtIndex(email string) int {
	for i, c := range email {
		if c == '@' {
			return i
		}
	}
	return len(email)
}

// DeleteAccount 注销账号
// 删除用户的所有数据，包括：用户信息、会员信息、方案数据
func (s *AuthService) DeleteAccount(userID uint) error {
	// 使用事务确保数据一致性
	tx := global.GVA_DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 1. 删除用户的所有方案
	if err := tx.Where("user_id = ?", userID).Delete(&entity.Project{}).Error; err != nil {
		tx.Rollback()
		return errors.New("注销失败，请稍后重试")
	}

	// 2. 删除用户会员信息
	if err := tx.Where("user_id = ?", userID).Delete(&entity.UserMember{}).Error; err != nil {
		tx.Rollback()
		return errors.New("注销失败，请稍后重试")
	}

	// 3. 删除用户信息
	if err := tx.Delete(&entity.User{}, userID).Error; err != nil {
		tx.Rollback()
		return errors.New("注销失败，请稍后重试")
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return errors.New("注销失败，请稍后重试")
	}

	return nil
}
