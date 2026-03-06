package entity

import "time"

// FinishedWorkReport 成品举报
type FinishedWorkReport struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	WorkID     uint       `json:"work_id" gorm:"index;not null"`
	ReporterID uint       `json:"reporter_id" gorm:"index;not null"`
	Reason     string     `json:"reason" gorm:"size:100;not null"`
	Detail     string     `json:"detail" gorm:"size:500"`
	Status     int        `json:"status" gorm:"default:0;index;comment:0待处理1已采纳2已驳回"`
	HandleNote string     `json:"handle_note" gorm:"size:200"`
	HandledBy  uint       `json:"handled_by" gorm:"index"`
	HandledAt  *time.Time `json:"handled_at"`
}

func (FinishedWorkReport) TableName() string {
	return "finished_work_reports"
}
