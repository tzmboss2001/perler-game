package entity

import "time"

// CommunityReport 社区举报记录
type CommunityReport struct {
	ID            uint       `json:"id" gorm:"primaryKey"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	PostID        uint       `json:"post_id" gorm:"index;not null"`
	PostUserID    uint       `json:"post_user_id" gorm:"index;not null"`
	ReporterID    uint       `json:"reporter_id" gorm:"index;not null"`
	Reason        string     `json:"reason" gorm:"size:80;not null"`
	Detail        string     `json:"detail" gorm:"size:500"`
	EvidenceURLs  string     `json:"evidence_urls" gorm:"type:text;comment:evidence urls json"`
	Priority      int        `json:"priority" gorm:"default:0;index;comment:0普通1高优"`
	RiskReason    string     `json:"risk_reason" gorm:"size:120"`
	Status        int        `json:"status" gorm:"default:0;index;comment:0待处理1已采纳2已驳回"`
	HandleNote    string     `json:"handle_note" gorm:"size:200"`
	HandledBy     *uint      `json:"handled_by" gorm:"index"`
	HandledAt     *time.Time `json:"handled_at"`
	SnapshotTitle string     `json:"snapshot_title" gorm:"size:100"`
}

func (CommunityReport) TableName() string {
	return "community_reports"
}
