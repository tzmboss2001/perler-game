package entity

import (
	"time"
)

// Challenge 挑战定义
type Challenge struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Code        string    `json:"code" gorm:"uniqueIndex;size:50"`
	Name        string    `json:"name" gorm:"size:100"`
	Description string    `json:"description" gorm:"size:255"`
	Type        string    `json:"type" gorm:"size:30;comment:time_limit/fixed_temp/crash_target"`
	Icon        string    `json:"icon" gorm:"size:10"`
	Difficulty  string    `json:"difficulty" gorm:"size:20;comment:easy/medium/hard"`
	Constraints string    `json:"constraints" gorm:"type:text;comment:JSON"`
	Scoring     string    `json:"scoring" gorm:"type:text;comment:JSON"`
	TemplateID  string    `json:"template_id" gorm:"size:50"`
	BoardWidth  int       `json:"board_width" gorm:"default:15"`
	BoardHeight int       `json:"board_height" gorm:"default:15"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
}

func (Challenge) TableName() string {
	return "challenges"
}
