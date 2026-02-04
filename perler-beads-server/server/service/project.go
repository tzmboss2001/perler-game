package service

import (
	"errors"
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
)

type ProjectService struct{}

var ProjectServiceApp = new(ProjectService)

// Create 创建方案
func (s *ProjectService) Create(req *request.CreateProjectReq, userID uint) (uint, error) {
	project := entity.Project{
		UserID:        userID,
		DeviceID:      req.DeviceID,
		Name:          req.Name,
		ThumbnailURL:  req.ThumbnailURL,
		OriginalImage: req.OriginalImage,
		BeadData:      entity.JSON(req.BeadData),
		Settings:      entity.JSON(req.Settings),
		Progress:      nil, // 初始没有进度
		Status:        0,   // 进行中
	}

	if err := global.GVA_DB.Create(&project).Error; err != nil {
		return 0, err
	}

	return project.ID, nil
}

// GetList 获取方案列表
func (s *ProjectService) GetList(req *request.ProjectListReq, userID uint) ([]response.ProjectInfo, int64, error) {
	var projects []entity.Project
	var total int64

	db := global.GVA_DB.Model(&entity.Project{})

	// 根据用户ID或设备ID查询
	if userID > 0 {
		db = db.Where("user_id = ?", userID)
	} else if req.DeviceID != "" {
		db = db.Where("device_id = ?", req.DeviceID)
	} else {
		return nil, 0, errors.New("需要用户ID或设备ID")
	}

	// 状态过滤
	if req.Status != nil {
		db = db.Where("status = ?", *req.Status)
	}

	// 计数
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("updated_at DESC").
		Offset(offset).
		Limit(req.PageSize).
		Find(&projects).Error; err != nil {
		return nil, 0, err
	}

	// 转换为响应格式
	list := make([]response.ProjectInfo, len(projects))
	for i, p := range projects {
		list[i] = response.ProjectInfo{
			ID:           p.ID,
			Name:         p.Name,
			ThumbnailURL: p.ThumbnailURL,
			Settings:     p.Settings,
			Progress:     p.Progress,
			Status:       p.Status,
			CreatedAt:    p.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:    p.UpdatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	return list, total, nil
}

// GetByID 获取方案详情
func (s *ProjectService) GetByID(id uint, userID uint, deviceID string) (*response.ProjectDetail, error) {
	var project entity.Project

	db := global.GVA_DB.Where("id = ?", id)

	// 验证权限：用户ID或设备ID必须匹配
	if userID > 0 {
		db = db.Where("user_id = ?", userID)
	} else if deviceID != "" {
		db = db.Where("device_id = ?", deviceID)
	} else {
		return nil, errors.New("无权访问")
	}

	if err := db.First(&project).Error; err != nil {
		return nil, err
	}

	detail := &response.ProjectDetail{
		ID:            project.ID,
		Name:          project.Name,
		ThumbnailURL:  project.ThumbnailURL,
		OriginalImage: project.OriginalImage,
		BeadData:      project.BeadData,
		Settings:      project.Settings,
		Progress:      project.Progress,
		Status:        project.Status,
		CreatedAt:     project.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:     project.UpdatedAt.Format("2006-01-02 15:04:05"),
	}

	return detail, nil
}

// Update 更新方案
func (s *ProjectService) Update(id uint, req *request.UpdateProjectReq, userID uint, deviceID string) error {
	var project entity.Project

	db := global.GVA_DB.Where("id = ?", id)

	// 验证权限
	if userID > 0 {
		db = db.Where("user_id = ?", userID)
	} else if deviceID != "" {
		db = db.Where("device_id = ?", deviceID)
	} else {
		return errors.New("无权访问")
	}

	if err := db.First(&project).Error; err != nil {
		return err
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.BeadData != nil {
		updates["bead_data"] = entity.JSON(req.BeadData)
	}
	if req.Settings != nil {
		updates["settings"] = entity.JSON(req.Settings)
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if len(updates) == 0 {
		return nil
	}

	return global.GVA_DB.Model(&project).Updates(updates).Error
}

// UpdateProgress 更新制作进度
func (s *ProjectService) UpdateProgress(id uint, req *request.UpdateProgressReq, userID uint, deviceID string) error {
	var project entity.Project

	db := global.GVA_DB.Where("id = ?", id)

	// 验证权限
	if userID > 0 {
		db = db.Where("user_id = ?", userID)
	} else if deviceID != "" {
		db = db.Where("device_id = ?", deviceID)
	} else {
		return errors.New("无权访问")
	}

	if err := db.First(&project).Error; err != nil {
		return err
	}

	return global.GVA_DB.Model(&project).Update("progress", entity.JSON(req.Progress)).Error
}

// Delete 删除方案
func (s *ProjectService) Delete(id uint, userID uint, deviceID string) error {
	db := global.GVA_DB.Where("id = ?", id)

	// 验证权限
	if userID > 0 {
		db = db.Where("user_id = ?", userID)
	} else if deviceID != "" {
		db = db.Where("device_id = ?", deviceID)
	} else {
		return errors.New("无权访问")
	}

	result := db.Delete(&entity.Project{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("方案不存在或无权删除")
	}

	return nil
}
