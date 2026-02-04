package service

import (
	"fmt"
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
)

type TemplateService struct{}

// CreateTemplate 创建模板
func (s *TemplateService) CreateTemplate(req *request.CreateTemplateRequest) (*entity.Template, error) {
	template := &entity.Template{
		Name:         req.Name,
		CategoryID:   req.CategoryID,
		ThumbnailURL: req.ThumbnailURL,
		BeadData:     entity.JSON(req.BeadData),
		GridWidth:    req.GridWidth,
		GridHeight:   req.GridHeight,
		BeadCount:    req.BeadCount,
		ColorCount:   req.ColorCount,
		Difficulty:   req.Difficulty,
		IsFeatured:   req.IsFeatured,
		SortOrder:    req.SortOrder,
		Status:       1, // 默认上架
	}

	if err := global.GVA_DB.Create(template).Error; err != nil {
		return nil, err
	}
	return template, nil
}

// UpdateTemplate 更新模板
func (s *TemplateService) UpdateTemplate(id uint, req *request.UpdateTemplateRequest) error {
	updates := make(map[string]interface{})

	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.CategoryID != 0 {
		updates["category_id"] = req.CategoryID
	}
	if req.ThumbnailURL != "" {
		updates["thumbnail_url"] = req.ThumbnailURL
	}
	if req.BeadData != nil {
		updates["bead_data"] = entity.JSON(req.BeadData)
	}
	if req.GridWidth != 0 {
		updates["grid_width"] = req.GridWidth
	}
	if req.GridHeight != 0 {
		updates["grid_height"] = req.GridHeight
	}
	if req.BeadCount != 0 {
		updates["bead_count"] = req.BeadCount
	}
	if req.ColorCount != 0 {
		updates["color_count"] = req.ColorCount
	}
	if req.Difficulty != "" {
		updates["difficulty"] = req.Difficulty
	}
	if req.IsFeatured != nil {
		updates["is_featured"] = *req.IsFeatured
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	return global.GVA_DB.Model(&entity.Template{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteTemplate 删除模板
func (s *TemplateService) DeleteTemplate(id uint) error {
	return global.GVA_DB.Delete(&entity.Template{}, id).Error
}

// GetTemplateByID 获取模板详情
func (s *TemplateService) GetTemplateByID(id uint) (*response.TemplateResponse, error) {
	var template entity.Template
	if err := global.GVA_DB.First(&template, id).Error; err != nil {
		return nil, err
	}

	// 获取分类名称
	var categoryName string
	if template.CategoryID > 0 {
		var category entity.TemplateCategory
		if err := global.GVA_DB.Select("name").First(&category, template.CategoryID).Error; err == nil {
			categoryName = category.Name
		}
	}

	return &response.TemplateResponse{
		ID:           template.ID,
		CreatedAt:    template.CreatedAt,
		Name:         template.Name,
		CategoryID:   template.CategoryID,
		CategoryName: categoryName,
		ThumbnailURL: template.ThumbnailURL,
		BeadData:     map[string]interface{}(template.BeadData),
		GridWidth:    template.GridWidth,
		GridHeight:   template.GridHeight,
		GridSize:     fmt.Sprintf("%dx%d", template.GridWidth, template.GridHeight),
		BeadCount:    template.BeadCount,
		ColorCount:   template.ColorCount,
		Difficulty:   template.Difficulty,
		IsFeatured:   template.IsFeatured,
		UseCount:     template.UseCount,
		Status:       template.Status,
	}, nil
}

// GetTemplateList 获取模板列表
func (s *TemplateService) GetTemplateList(req *request.TemplateListRequest) ([]response.TemplateListResponse, int64, error) {
	db := global.GVA_DB.Model(&entity.Template{}).Where("status = ?", 1)

	// 筛选条件
	if req.CategoryID > 0 {
		db = db.Where("category_id = ?", req.CategoryID)
	}
	if req.IsFeatured != nil {
		db = db.Where("is_featured = ?", *req.IsFeatured)
	}
	if req.Difficulty != "" {
		db = db.Where("difficulty = ?", req.Difficulty)
	}
	if req.Keyword != "" {
		db = db.Where("name LIKE ?", "%"+req.Keyword+"%")
	}

	// 总数
	var total int64
	db.Count(&total)

	// 分页
	var templates []entity.Template
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("sort_order DESC, id DESC").Offset(offset).Limit(req.PageSize).Find(&templates).Error; err != nil {
		return nil, 0, err
	}

	// 获取分类映射
	categoryMap := s.getCategoryMap()

	// 转换响应
	result := make([]response.TemplateListResponse, len(templates))
	for i, t := range templates {
		result[i] = response.TemplateListResponse{
			ID:           t.ID,
			Name:         t.Name,
			CategoryID:   t.CategoryID,
			CategoryName: categoryMap[t.CategoryID],
			ThumbnailURL: t.ThumbnailURL,
			GridSize:     fmt.Sprintf("%dx%d", t.GridWidth, t.GridHeight),
			BeadCount:    t.BeadCount,
			ColorCount:   t.ColorCount,
			Difficulty:   t.Difficulty,
			IsFeatured:   t.IsFeatured,
			UseCount:     t.UseCount,
			CreatedAt:    t.CreatedAt,
		}
	}

	return result, total, nil
}

// GetFeaturedTemplates 获取精选模板（首页用）
func (s *TemplateService) GetFeaturedTemplates(limit int) ([]response.FeaturedTemplateResponse, error) {
	var templates []entity.Template
	if err := global.GVA_DB.Where("status = ? AND is_featured = ?", 1, true).
		Order("sort_order DESC, id DESC").
		Limit(limit).
		Find(&templates).Error; err != nil {
		return nil, err
	}

	// 获取分类映射
	categoryMap := s.getCategoryMap()

	// 转换响应
	result := make([]response.FeaturedTemplateResponse, len(templates))
	for i, t := range templates {
		result[i] = response.FeaturedTemplateResponse{
			ID:         t.ID,
			Title:      t.Name,
			ImageURL:   t.ThumbnailURL,
			BeadCount:  t.BeadCount,
			GridSize:   fmt.Sprintf("%dx%d", t.GridWidth, t.GridHeight),
			Difficulty: t.Difficulty,
			IsOfficial: true,
			Category:   categoryMap[t.CategoryID],
		}
	}

	return result, nil
}

// IncrementUseCount 增加使用次数
func (s *TemplateService) IncrementUseCount(id uint) error {
	return global.GVA_DB.Model(&entity.Template{}).Where("id = ?", id).
		UpdateColumn("use_count", global.GVA_DB.Raw("use_count + 1")).Error
}

// getCategoryMap 获取分类ID到名称的映射
func (s *TemplateService) getCategoryMap() map[uint]string {
	var categories []entity.TemplateCategory
	global.GVA_DB.Select("id, name").Where("status = ?", 1).Find(&categories)

	m := make(map[uint]string)
	for _, c := range categories {
		m[c.ID] = c.Name
	}
	return m
}

// ========== 分类相关 ==========

// CreateCategory 创建分类
func (s *TemplateService) CreateCategory(req *request.CreateCategoryRequest) (*entity.TemplateCategory, error) {
	category := &entity.TemplateCategory{
		Name:      req.Name,
		Icon:      req.Icon,
		SortOrder: req.SortOrder,
		Status:    1,
	}

	if err := global.GVA_DB.Create(category).Error; err != nil {
		return nil, err
	}
	return category, nil
}

// UpdateCategory 更新分类
func (s *TemplateService) UpdateCategory(id uint, req *request.UpdateCategoryRequest) error {
	updates := make(map[string]interface{})

	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Icon != "" {
		updates["icon"] = req.Icon
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	return global.GVA_DB.Model(&entity.TemplateCategory{}).Where("id = ?", id).Updates(updates).Error
}

// DeleteCategory 删除分类
func (s *TemplateService) DeleteCategory(id uint) error {
	return global.GVA_DB.Delete(&entity.TemplateCategory{}, id).Error
}

// GetCategoryList 获取分类列表
func (s *TemplateService) GetCategoryList() ([]response.CategoryResponse, error) {
	var categories []entity.TemplateCategory
	if err := global.GVA_DB.Where("status = ?", 1).Order("sort_order DESC, id ASC").Find(&categories).Error; err != nil {
		return nil, err
	}

	// 统计每个分类的模板数量
	type CountResult struct {
		CategoryID uint
		Count      int
	}
	var counts []CountResult
	global.GVA_DB.Model(&entity.Template{}).
		Select("category_id, COUNT(*) as count").
		Where("status = ?", 1).
		Group("category_id").
		Scan(&counts)

	countMap := make(map[uint]int)
	for _, c := range counts {
		countMap[c.CategoryID] = c.Count
	}

	// 转换响应
	result := make([]response.CategoryResponse, len(categories))
	for i, c := range categories {
		result[i] = response.CategoryResponse{
			ID:            c.ID,
			Name:          c.Name,
			Icon:          c.Icon,
			SortOrder:     c.SortOrder,
			TemplateCount: countMap[c.ID],
		}
	}

	return result, nil
}
