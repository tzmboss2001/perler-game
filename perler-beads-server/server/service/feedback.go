package service

import (
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/request"
)

type FeedbackService struct{}

var FeedbackServiceApp = new(FeedbackService)

// Create 创建反馈
func (s *FeedbackService) Create(req *request.CreateFeedbackReq, userID *uint, ip, userAgent string) error {
	feedback := entity.Feedback{
		UserID:    userID,
		Type:      req.Type,
		Content:   req.Content,
		Contact:   req.Contact,
		Status:    0, // 待处理
		IP:        ip,
		UserAgent: userAgent,
	}

	return global.GVA_DB.Create(&feedback).Error
}
