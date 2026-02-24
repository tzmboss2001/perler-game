package entity

import (
	"time"
)

// Work 作品模型
type Work struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	UserID       uint      `json:"user_id" gorm:"index"`
	DeviceID     string    `json:"device_id" gorm:"size:100;index"`
	Title        string    `json:"title" gorm:"size:100"`
	BoardJSON    string    `json:"board_json" gorm:"type:longtext"`
	Thumbnail    string    `json:"thumbnail" gorm:"type:longtext"`
	TemplateID   string    `json:"template_id" gorm:"size:50"`
	BeadCount    int       `json:"bead_count" gorm:"default:0"`
	BoardWidth   int       `json:"board_width" gorm:"default:15"`
	BoardHeight  int       `json:"board_height" gorm:"default:15"`
	IroningScore int       `json:"ironing_score" gorm:"default:0"`
	FailureType  string    `json:"failure_type" gorm:"size:30"`
	RiskScore    float64   `json:"risk_score" gorm:"default:0"`
	IsPublic     bool      `json:"is_public" gorm:"default:false;index"`
	ViewCount    int       `json:"view_count" gorm:"default:0"`
	LikeCount    int       `json:"like_count" gorm:"default:0"`
	CommentCount int       `json:"comment_count" gorm:"default:0"`
}

func (Work) TableName() string {
	return "works"
}
