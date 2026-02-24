package service

import (
	"errors"
	"perler-game-server/global"
	"perler-game-server/model/entity"
	"perler-game-server/model/request"
	"perler-game-server/model/response"

	"gorm.io/gorm"
)

type GalleryService struct{}

var GalleryServiceApp = new(GalleryService)

// List 广场作品列表
func (s *GalleryService) List(req *request.GalleryListReq) (*response.PageResult, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	var total int64
	db := global.GVA_DB.Model(&entity.Work{}).Where("is_public = ?", true)
	db.Count(&total)

	// 排序方式
	var orderBy string
	switch req.Sort {
	case "popular":
		orderBy = "like_count DESC, created_at DESC"
	case "crash":
		orderBy = "risk_score DESC, created_at DESC"
	default:
		orderBy = "created_at DESC"
	}

	var works []entity.Work
	if err := db.Order(orderBy).
		Offset((req.Page - 1) * req.PageSize).
		Limit(req.PageSize).
		Find(&works).Error; err != nil {
		return nil, err
	}

	// 批量获取作者信息
	userIDs := make([]uint, 0, len(works))
	for _, w := range works {
		userIDs = append(userIDs, w.UserID)
	}
	userMap := s.getUserMap(userIDs)

	items := make([]response.GalleryItem, len(works))
	for i, w := range works {
		user := userMap[w.UserID]
		items[i] = response.GalleryItem{
			ID:             w.ID,
			Title:          w.Title,
			Thumbnail:      w.Thumbnail,
			BeadCount:      w.BeadCount,
			BoardWidth:     w.BoardWidth,
			BoardHeight:    w.BoardHeight,
			IroningScore:   w.IroningScore,
			FailureType:    w.FailureType,
			RiskScore:      w.RiskScore,
			ViewCount:      w.ViewCount,
			LikeCount:      w.LikeCount,
			CommentCount:   w.CommentCount,
			CreatedAt:      w.CreatedAt,
			AuthorID:       w.UserID,
			AuthorNickname: user.Nickname,
			AuthorAvatar:   user.Avatar,
		}
	}

	return &response.PageResult{
		List:     items,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}

// GetDetail 获取广场作品详情
func (s *GalleryService) GetDetail(workID uint, currentUserID uint) (*response.GalleryDetail, error) {
	var work entity.Work
	if err := global.GVA_DB.First(&work, workID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("作品不存在")
		}
		return nil, err
	}

	if !work.IsPublic {
		return nil, errors.New("作品未公开")
	}

	// 增加浏览量
	global.GVA_DB.Model(&work).Update("view_count", gorm.Expr("view_count + 1"))

	// 获取作者信息
	var user entity.User
	global.GVA_DB.First(&user, work.UserID)

	// 检查当前用户是否已点赞
	isLiked := false
	if currentUserID > 0 {
		var count int64
		global.GVA_DB.Model(&entity.Like{}).Where("user_id = ? AND work_id = ?", currentUserID, workID).Count(&count)
		isLiked = count > 0
	}

	return &response.GalleryDetail{
		GalleryItem: response.GalleryItem{
			ID:             work.ID,
			Title:          work.Title,
			Thumbnail:      work.Thumbnail,
			BeadCount:      work.BeadCount,
			BoardWidth:     work.BoardWidth,
			BoardHeight:    work.BoardHeight,
			IroningScore:   work.IroningScore,
			FailureType:    work.FailureType,
			RiskScore:      work.RiskScore,
			ViewCount:      work.ViewCount + 1,
			LikeCount:      work.LikeCount,
			CommentCount:   work.CommentCount,
			CreatedAt:      work.CreatedAt,
			AuthorID:       work.UserID,
			AuthorNickname: user.Nickname,
			AuthorAvatar:   user.Avatar,
		},
		BoardJSON: work.BoardJSON,
		IsLiked:   isLiked,
	}, nil
}

// ToggleLike 点赞/取消点赞
func (s *GalleryService) ToggleLike(userID uint, workID uint) (bool, error) {
	var like entity.Like
	err := global.GVA_DB.Where("user_id = ? AND work_id = ?", userID, workID).First(&like).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 添加点赞
			newLike := entity.Like{UserID: userID, WorkID: workID}
			if err := global.GVA_DB.Create(&newLike).Error; err != nil {
				return false, errors.New("点赞失败")
			}
			global.GVA_DB.Model(&entity.Work{}).Where("id = ?", workID).Update("like_count", gorm.Expr("like_count + 1"))
			return true, nil
		}
		return false, err
	}

	// 取消点赞
	global.GVA_DB.Delete(&like)
	global.GVA_DB.Model(&entity.Work{}).Where("id = ? AND like_count > 0", workID).Update("like_count", gorm.Expr("like_count - 1"))
	return false, nil
}

// GetComments 获取评论列表
func (s *GalleryService) GetComments(workID uint, page, pageSize int) (*response.PageResult, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}

	var total int64
	db := global.GVA_DB.Model(&entity.Comment{}).Where("work_id = ?", workID)
	db.Count(&total)

	var comments []entity.Comment
	if err := db.Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&comments).Error; err != nil {
		return nil, err
	}

	// 批量获取用户信息
	userIDs := make([]uint, 0, len(comments))
	for _, c := range comments {
		userIDs = append(userIDs, c.UserID)
	}
	userMap := s.getUserMap(userIDs)

	items := make([]response.CommentItem, len(comments))
	for i, c := range comments {
		user := userMap[c.UserID]
		items[i] = response.CommentItem{
			ID:           c.ID,
			Content:      c.Content,
			CreatedAt:    c.CreatedAt,
			UserID:       c.UserID,
			UserNickname: user.Nickname,
			UserAvatar:   user.Avatar,
		}
	}

	return &response.PageResult{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// PostComment 发表评论
func (s *GalleryService) PostComment(userID uint, workID uint, content string) error {
	// 检查作品是否存在且公开
	var work entity.Work
	if err := global.GVA_DB.First(&work, workID).Error; err != nil {
		return errors.New("作品不存在")
	}
	if !work.IsPublic {
		return errors.New("作品未公开")
	}

	comment := entity.Comment{
		UserID:  userID,
		WorkID:  workID,
		Content: content,
	}

	if err := global.GVA_DB.Create(&comment).Error; err != nil {
		return errors.New("评论失败")
	}

	global.GVA_DB.Model(&work).Update("comment_count", gorm.Expr("comment_count + 1"))
	return nil
}

// GetLeaderboard 翻车排行榜
func (s *GalleryService) GetLeaderboard(limit int) ([]response.LeaderboardItem, error) {
	if limit <= 0 {
		limit = 20
	}

	var works []entity.Work
	if err := global.GVA_DB.Where("is_public = ? AND failure_type != '' AND failure_type IS NOT NULL", true).
		Order("risk_score DESC").
		Limit(limit).
		Find(&works).Error; err != nil {
		return nil, err
	}

	userIDs := make([]uint, 0, len(works))
	for _, w := range works {
		userIDs = append(userIDs, w.UserID)
	}
	userMap := s.getUserMap(userIDs)

	items := make([]response.LeaderboardItem, len(works))
	for i, w := range works {
		user := userMap[w.UserID]
		items[i] = response.LeaderboardItem{
			Rank:           i + 1,
			WorkID:         w.ID,
			Title:          w.Title,
			Thumbnail:      w.Thumbnail,
			FailureType:    w.FailureType,
			RiskScore:      w.RiskScore,
			IroningScore:   w.IroningScore,
			AuthorNickname: user.Nickname,
			AuthorAvatar:   user.Avatar,
		}
	}

	return items, nil
}

// getUserMap 批量获取用户信息
func (s *GalleryService) getUserMap(userIDs []uint) map[uint]entity.User {
	userMap := make(map[uint]entity.User)
	if len(userIDs) == 0 {
		return userMap
	}

	var users []entity.User
	global.GVA_DB.Where("id IN ?", userIDs).Find(&users)
	for _, u := range users {
		userMap[u.ID] = u
	}
	return userMap
}
