package entity

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// Project 作品/方案
type Project struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	UserID        uint      `json:"user_id" gorm:"index"`                        // 用户ID（可选，支持游客）
	DeviceID      string    `json:"device_id" gorm:"index;size:64"`              // 设备ID（游客模式）
	Name          string    `json:"name" gorm:"size:100"`                        // 方案名称
	ThumbnailURL  string    `json:"thumbnail_url" gorm:"size:500"`               // 缩略图URL（Base64或OSS）
	OriginalImage string    `json:"original_image" gorm:"type:longtext"`         // 原图Base64
	BeadData      JSON      `json:"bead_data" gorm:"type:json"`                  // 珠子数据
	Settings      JSON      `json:"settings" gorm:"type:json"`                   // 设置参数
	Progress      JSON      `json:"progress" gorm:"type:json"`                   // 制作进度
	Status        int       `json:"status" gorm:"default:0;comment:0进行中1已完成"` // 0:进行中 1:已完成
}

// TableName 指定表名
func (Project) TableName() string {
	return "projects"
}

// JSON 自定义类型，支持 GORM 存储 JSON 数据
type JSON map[string]interface{}

// Value 实现 driver.Valuer 接口
func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan 实现 sql.Scanner 接口
func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}
