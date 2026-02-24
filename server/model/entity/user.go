package entity

import (
	"time"
)

// User 用户模型
type User struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Email        string     `json:"email" gorm:"uniqueIndex;size:100"`
	PasswordHash string     `json:"-" gorm:"size:255"`
	Nickname     string     `json:"nickname" gorm:"size:50"`
	Avatar       string     `json:"avatar" gorm:"size:500"`
	Status       int        `json:"status" gorm:"default:0;comment:0正常1禁用"`
	LastLoginAt  *time.Time `json:"last_login_at"`
	LastLoginIP  string     `json:"last_login_ip" gorm:"size:45"`
}

func (User) TableName() string {
	return "users"
}
