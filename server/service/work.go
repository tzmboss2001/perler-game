package service

import (
	"errors"
	"perler-game-server/global"
	"perler-game-server/model/entity"
	"perler-game-server/model/request"
	"perler-game-server/model/response"

	"gorm.io/gorm"
)

type WorkService struct{}

var WorkServiceApp = new(WorkService)

// Save 保存作品
func (s *WorkService) Save(userID uint, req *request.WorkSaveReq) (uint, error) {
	work := entity.Work{
		UserID:       userID,
		DeviceID:     req.DeviceID,
		Title:        req.Title,
		BoardJSON:    req.BoardJSON,
		Thumbnail:    req.Thumbnail,
		TemplateID:   req.TemplateID,
		BeadCount:    req.BeadCount,
		BoardWidth:   req.BoardWidth,
		BoardHeight:  req.BoardHeight,
		IroningScore: req.IroningScore,
		FailureType:  req.FailureType,
		RiskScore:    req.RiskScore,
		IsPublic:     false,
	}

	if req.Title == "" {
		work.Title = "未命名作品"
	}

	if err := global.GVA_DB.Create(&work).Error; err != nil {
		return 0, errors.New("保存作品失败")
	}

	return work.ID, nil
}

// List 获取我的作品列表
func (s *WorkService) List(userID uint, page, pageSize int) (*response.PageResult, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}

	var total int64
	var works []entity.Work

	db := global.GVA_DB.Model(&entity.Work{}).Where("user_id = ?", userID)
	db.Count(&total)

	if err := db.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&works).Error; err != nil {
		return nil, err
	}

	items := make([]response.WorkItem, len(works))
	for i, w := range works {
		items[i] = response.WorkItem{
			ID:           w.ID,
			Title:        w.Title,
			Thumbnail:    w.Thumbnail,
			TemplateID:   w.TemplateID,
			BeadCount:    w.BeadCount,
			BoardWidth:   w.BoardWidth,
			BoardHeight:  w.BoardHeight,
			IroningScore: w.IroningScore,
			FailureType:  w.FailureType,
			RiskScore:    w.RiskScore,
			IsPublic:     w.IsPublic,
			ViewCount:    w.ViewCount,
			LikeCount:    w.LikeCount,
			CommentCount: w.CommentCount,
			CreatedAt:    w.CreatedAt,
		}
	}

	return &response.PageResult{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// GetByID 获取作品详情
func (s *WorkService) GetByID(workID uint, userID uint) (*response.WorkDetail, error) {
	var work entity.Work
	if err := global.GVA_DB.First(&work, workID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("作品不存在")
		}
		return nil, err
	}

	// 验证所有权
	if work.UserID != userID {
		return nil, errors.New("无权查看该作品")
	}

	return &response.WorkDetail{
		WorkItem: response.WorkItem{
			ID:           work.ID,
			Title:        work.Title,
			Thumbnail:    work.Thumbnail,
			TemplateID:   work.TemplateID,
			BeadCount:    work.BeadCount,
			BoardWidth:   work.BoardWidth,
			BoardHeight:  work.BoardHeight,
			IroningScore: work.IroningScore,
			FailureType:  work.FailureType,
			RiskScore:    work.RiskScore,
			IsPublic:     work.IsPublic,
			ViewCount:    work.ViewCount,
			LikeCount:    work.LikeCount,
			CommentCount: work.CommentCount,
			CreatedAt:    work.CreatedAt,
		},
		BoardJSON: work.BoardJSON,
		UserID:    work.UserID,
	}, nil
}

// Delete 删除作品
func (s *WorkService) Delete(workID uint, userID uint) error {
	var work entity.Work
	if err := global.GVA_DB.First(&work, workID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("作品不存在")
		}
		return err
	}

	if work.UserID != userID {
		return errors.New("无权删除该作品")
	}

	// 删除关联的点赞和评论
	tx := global.GVA_DB.Begin()
	tx.Where("work_id = ?", workID).Delete(&entity.Like{})
	tx.Where("work_id = ?", workID).Delete(&entity.Comment{})
	tx.Delete(&work)

	return tx.Commit().Error
}

// Publish 发布作品到广场
func (s *WorkService) Publish(workID uint, userID uint) error {
	var work entity.Work
	if err := global.GVA_DB.First(&work, workID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("作品不存在")
		}
		return err
	}

	if work.UserID != userID {
		return errors.New("无权操作该作品")
	}

	if work.IsPublic {
		return errors.New("作品已发布")
	}

	return global.GVA_DB.Model(&work).Update("is_public", true).Error
}
