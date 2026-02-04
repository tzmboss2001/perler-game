package entity

import (
	"time"
)

// User 用户模型
type User struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	Email         string    `json:"email" gorm:"uniqueIndex;size:100"`             // 邮箱（唯一）
	Username      string    `json:"username" gorm:"size:50"`                       // 用户名
	PasswordHash  string    `json:"-" gorm:"size:255"`                             // 密码哈希（不输出到JSON）
	Nickname      string    `json:"nickname" gorm:"size:50"`                       // 昵称
	Avatar        string    `json:"avatar" gorm:"size:500"`                        // 头像URL
	Phone         string    `json:"phone" gorm:"size:20"`                          // 手机号（可选）
	Status        int       `json:"status" gorm:"default:0;comment:0正常1禁用"`       // 账户状态
	EmailVerified bool      `json:"email_verified" gorm:"default:false"`           // 邮箱是否验证
	LastLoginAt   *time.Time `json:"last_login_at"`                                // 最后登录时间
	LastLoginIP   string    `json:"last_login_ip" gorm:"size:45"`                  // 最后登录IP
}

// TableName 指定表名
func (User) TableName() string {
	return "users"
}

// UserMember 会员信息
type UserMember struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	UserID    uint      `json:"user_id" gorm:"uniqueIndex"`                     // 用户ID
	Level     int       `json:"level" gorm:"default:0;comment:0普通1VIP"`        // 会员等级
	ExpireAt  *time.Time `json:"expire_at"`                                     // 会员过期时间
}

// TableName 指定表名
func (UserMember) TableName() string {
	return "user_members"
}
