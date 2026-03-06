package entity

import "time"

// CommunityReviewLog 社区审核操作日志
// 用于记录每次审核动作，便于审计追溯。
type CommunityReviewLog struct {
	ID               uint      `json:"id" gorm:"primaryKey"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	PostID           uint      `json:"post_id" gorm:"index;not null"`
	ReviewerID       uint      `json:"reviewer_id" gorm:"index;not null"`
	Action           string    `json:"action" gorm:"size:20;not null"`
	FromReviewStatus int       `json:"from_review_status" gorm:"index;not null"`
	ToReviewStatus   int       `json:"to_review_status" gorm:"index;not null"`
	Reason           string    `json:"reason" gorm:"size:200"`
	SnapshotTitle    string    `json:"snapshot_title" gorm:"size:100"`
}

func (CommunityReviewLog) TableName() string {
	return "community_review_logs"
}
