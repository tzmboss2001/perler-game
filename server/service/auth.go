package service

import (
	"errors"
	"perler-game-server/global"
	"perler-game-server/model/entity"
	"perler-game-server/model/request"
	"perler-game-server/model/response"
	"perler-game-server/utils"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct{}

var AuthServiceApp = new(AuthService)

// SmartLogin 智能登录（邮箱不存在时自动注册）
func (s *AuthService) SmartLogin(req *request.SmartLoginReq, ip string) (*response.SmartLoginResp, error) {
	var user entity.User
	isNewUser := false

	err := global.GVA_DB.Where("email = ?", req.Email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 用户不存在，自动注册
			nickname := req.Email[:findAtIndex(req.Email)]

			hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
			if hashErr != nil {
				return nil, errors.New("注册遇到问题，请稍后重试")
			}

			user = entity.User{
				Email:        req.Email,
				PasswordHash: string(hashedPassword),
				Nickname:     nickname,
				Status:       0,
			}

			if createErr := global.GVA_DB.Create(&user).Error; createErr != nil {
				return nil, errors.New("注册遇到问题，请稍后重试")
			}

			isNewUser = true
		} else {
			return nil, err
		}
	} else {
		// 用户存在，验证密码
		if user.Status != 0 {
			return nil, errors.New("该账户已被冻结，如有疑问请联系客服")
		}

		if pwdErr := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); pwdErr != nil {
			return nil, errors.New("密码不正确，请检查后重试")
		}
	}

	// 生成 Token
	j := utils.NewJWT()
	claims := j.CreateClaims(user.ID, user.Nickname)
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

	resp := &response.SmartLoginResp{
		Token: token,
		UserInfo: response.UserInfo{
			ID:       user.ID,
			Email:    user.Email,
			Nickname: user.Nickname,
			Avatar:   user.Avatar,
		},
		IsNewUser: isNewUser,
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

	return &response.UserInfo{
		ID:       user.ID,
		Email:    user.Email,
		Nickname: user.Nickname,
		Avatar:   user.Avatar,
	}, nil
}

// ChangePassword 修改密码
func (s *AuthService) ChangePassword(userID uint, req *request.ChangePasswordReq) error {
	var user entity.User

	if err := global.GVA_DB.First(&user, userID).Error; err != nil {
		return errors.New("用户信息获取失败，请重新登录")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return errors.New("原密码不正确，请检查后重试")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("修改密码遇到问题，请稍后重试")
	}

	return global.GVA_DB.Model(&user).Update("password_hash", string(hashedPassword)).Error
}

func findAtIndex(email string) int {
	for i, c := range email {
		if c == '@' {
			return i
		}
	}
	return len(email)
}
