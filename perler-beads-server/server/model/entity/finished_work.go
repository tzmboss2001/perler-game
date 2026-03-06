package entity

import "time"

// FinishedWork 用户成品相册作品
type FinishedWork struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	UserID       uint      `json:"user_id" gorm:"index;not null"`
	Title        string    `json:"title" gorm:"size:120;not null"`
	Description  string    `json:"description" gorm:"size:500"`
	CoverURL     string    `json:"cover_url" gorm:"size:500"`
	ImageURLs    string    `json:"image_urls" gorm:"type:text;comment:json array"`
	ImageCount   int       `json:"image_count" gorm:"default:0"`
	Status       int       `json:"status" gorm:"default:1;index;comment:1正常 0删除"`
	IsPublic     bool      `json:"is_public" gorm:"default:true;index"`
	ReviewStatus int       `json:"review_status" gorm:"default:0;index;comment:0待审 1通过 2驳回 3下架"`
	ReviewReason string    `json:"review_reason" gorm:"size:200"`
	LikeCount    int       `json:"like_count" gorm:"default:0"`
	CommentCount int       `json:"comment_count" gorm:"default:0"`
}

func (FinishedWork) TableName() string {
	return "finished_works"
}
