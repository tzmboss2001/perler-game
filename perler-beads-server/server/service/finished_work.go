package service

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"strings"
	"time"

	"gorm.io/gorm"
)

type FinishedWorkService struct{}

var FinishedWorkServiceApp = new(FinishedWorkService)

const (
	finishedWorkStatusActive = 1

	finishedWorkReviewPending  = 0
	finishedWorkReviewApproved = 1
	finishedWorkReviewRejected = 2
	finishedWorkReviewHidden   = 3
)

func finishedWorkAutoApproveEnabled() bool {
	raw := strings.TrimSpace(strings.ToLower(os.Getenv("FINISHED_WORK_AUTO_APPROVE")))
	switch raw {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func resolveFinishedWorkDir() (string, error) {
	if envDir := strings.TrimSpace(os.Getenv("FINISHED_WORK_DIR")); envDir != "" {
		return envDir, nil
	}
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	candidates := []string{
		filepath.Join(wd, "..", "..", "perler-beads", "public", "finished-works"),
		filepath.Join(wd, "..", "perler-beads", "public", "finished-works"),
	}
	for _, c := range candidates {
		if _, statErr := os.Stat(filepath.Dir(c)); statErr == nil {
			return c, nil
		}
	}
	return filepath.Join(wd, "finished-works"), nil
}

func extractBase64Payload(raw string) (string, string) {
	data := strings.TrimSpace(raw)
	ext := "png"
	if strings.HasPrefix(data, "data:") {
		parts := strings.SplitN(data, ",", 2)
		if len(parts) == 2 {
			head := strings.ToLower(parts[0])
			data = parts[1]
			switch {
			case strings.Contains(head, "image/jpeg"):
				ext = "jpg"
			case strings.Contains(head, "image/jpg"):
				ext = "jpg"
			case strings.Contains(head, "image/webp"):
				ext = "webp"
			case strings.Contains(head, "image/gif"):
				ext = "gif"
			default:
				ext = "png"
			}
		}
	}
	return data, ext
}

func saveFinishedWorkImage(workID uint, index int, base64Image string) (string, error) {
	payload, ext := extractBase64Payload(base64Image)
	bytes, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return "", fmt.Errorf("base64 decode failed: %w", err)
	}

	dir, err := resolveFinishedWorkDir()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("mkdir failed: %w", err)
	}

	filename := fmt.Sprintf("fw_%d_%d.%s", workID, index+1, ext)
	filePath := filepath.Join(dir, filename)
	if err := os.WriteFile(filePath, bytes, 0644); err != nil {
		return "", fmt.Errorf("write file failed: %w", err)
	}
	return "/finished-works/" + filename, nil
}

func (s *FinishedWorkService) Create(userID uint, req *request.CreateFinishedWorkRequest) (*response.FinishedWorkItem, error) {
	title := strings.TrimSpace(req.Title)
	description := strings.TrimSpace(req.Description)
	if title == "" {
		return nil, fmt.Errorf("title is required")
	}
	if len(req.ImagesBase64) == 0 {
		return nil, fmt.Errorf("images is required")
	}
	if len(req.ImagesBase64) > 9 {
		return nil, fmt.Errorf("too many images")
	}

	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}
	reviewStatus := finishedWorkReviewApproved
	reviewReason := ""
	if isPublic {
		if finishedWorkAutoApproveEnabled() {
			reviewStatus = finishedWorkReviewApproved
		} else {
			reviewStatus = finishedWorkReviewPending
			reviewReason = "待审核"
		}
	}

	work := entity.FinishedWork{
		UserID:       userID,
		Title:        title,
		Description:  description,
		Status:       finishedWorkStatusActive,
		IsPublic:     isPublic,
		ReviewStatus: reviewStatus,
		ReviewReason: reviewReason,
		ImageCount:   len(req.ImagesBase64),
		LikeCount:    0,
		CommentCount: 0,
	}
	if err := global.GVA_DB.Create(&work).Error; err != nil {
		return nil, err
	}

	urls := make([]string, 0, len(req.ImagesBase64))
	for i, image := range req.ImagesBase64 {
		url, err := saveFinishedWorkImage(work.ID, i, image)
		if err != nil {
			return nil, err
		}
		urls = append(urls, url)
	}
	coverURL := ""
	if len(urls) > 0 {
		coverURL = urls[0]
	}
	rawURLs, _ := json.Marshal(urls)
	if err := global.GVA_DB.Model(&work).Updates(map[string]interface{}{
		"cover_url":   coverURL,
		"image_urls":  string(rawURLs),
		"image_count": len(urls),
	}).Error; err != nil {
		return nil, err
	}

	return &response.FinishedWorkItem{
		ID:           work.ID,
		Title:        title,
		Description:  description,
		CoverURL:     coverURL,
		ImageURLs:    urls,
		ImageCount:   len(urls),
		Status:       finishedWorkStatusActive,
		IsPublic:     isPublic,
		ReviewStatus: reviewStatus,
		ReviewReason: reviewReason,
		CreatedAt:    work.CreatedAt,
	}, nil
}

func (s *FinishedWorkService) ListMy(userID uint, req *request.ListFinishedWorkRequest) ([]response.FinishedWorkItem, int64, error) {
	db := global.GVA_DB.Model(&entity.FinishedWork{}).Where("user_id = ?", userID)
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 50 {
		req.PageSize = 50
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []entity.FinishedWork
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]response.FinishedWorkItem, len(rows))
	for i, row := range rows {
		urls := make([]string, 0)
		if strings.TrimSpace(row.ImageURLs) != "" {
			_ = json.Unmarshal([]byte(row.ImageURLs), &urls)
		}
		result[i] = response.FinishedWorkItem{
			ID:           row.ID,
			Title:        row.Title,
			Description:  row.Description,
			CoverURL:     row.CoverURL,
			ImageURLs:    urls,
			ImageCount:   row.ImageCount,
			Status:       row.Status,
			IsPublic:     row.IsPublic,
			ReviewStatus: row.ReviewStatus,
			ReviewReason: row.ReviewReason,
			LikeCount:    row.LikeCount,
			CommentCount: row.CommentCount,
			CreatedAt:    row.CreatedAt,
		}
	}
	return result, total, nil
}

func (s *FinishedWorkService) Delete(userID uint, id uint) error {
	var row entity.FinishedWork
	if err := global.GVA_DB.Where("id = ? AND user_id = ?", id, userID).First(&row).Error; err != nil {
		return err
	}

	if strings.TrimSpace(row.ImageURLs) != "" {
		var urls []string
		_ = json.Unmarshal([]byte(row.ImageURLs), &urls)
		dir, dirErr := resolveFinishedWorkDir()
		if dirErr == nil {
			for _, u := range urls {
				name := path.Base(strings.TrimSpace(u))
				if name == "" || name == "." || name == "/" {
					continue
				}
				_ = os.Remove(filepath.Join(dir, name))
			}
		}
	}

	return global.GVA_DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("work_id = ?", row.ID).Delete(&entity.FinishedWorkLike{}).Error; err != nil {
			return err
		}
		if err := tx.Where("work_id = ?", row.ID).Delete(&entity.FinishedWorkComment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("work_id = ?", row.ID).Delete(&entity.FinishedWorkReport{}).Error; err != nil {
			return err
		}
		return tx.Delete(&entity.FinishedWork{}, row.ID).Error
	})
}

type finishedWorkWithUserRow struct {
	entity.FinishedWork
	UserNickname string `gorm:"column:user_nickname"`
	UserAvatar   string `gorm:"column:user_avatar"`
}

func applyFinishedWorkPublicListFilters(db *gorm.DB, req *request.ListFinishedWorkRequest, includeAuthor bool) *gorm.DB {
	keyword := strings.TrimSpace(req.Keyword)
	if keyword != "" {
		like := "%" + keyword + "%"
		if includeAuthor {
			db = db.Where(
				"(fw.title LIKE ? OR fw.description LIKE ? OR COALESCE(NULLIF(u.nickname, ''), NULLIF(u.username, ''), '用户') LIKE ?)",
				like, like, like,
			)
		} else {
			db = db.Where("(fw.title LIKE ? OR fw.description LIKE ?)", like, like)
		}
	}
	return db
}

func finishedWorkPublicOrder(sort string) string {
	switch strings.TrimSpace(strings.ToLower(sort)) {
	case "hottest", "hot":
		return "fw.like_count DESC, fw.created_at DESC"
	default:
		return "fw.created_at DESC"
	}
}

func (s *FinishedWorkService) ListPublic(req *request.ListFinishedWorkRequest) ([]response.FinishedWorkItem, int64, error) {
	db := global.GVA_DB.Table("finished_works fw").
		Select(`fw.*,
		COALESCE(NULLIF(u.nickname, ''), NULLIF(u.username, ''), '鐢ㄦ埛') as user_nickname,
		COALESCE(u.avatar, '') as user_avatar`).
		Joins("LEFT JOIN users u ON u.id = fw.user_id").
		Where("fw.status = ? AND fw.is_public = ? AND fw.review_status = ?", finishedWorkStatusActive, true, finishedWorkReviewApproved)
	db = applyFinishedWorkPublicListFilters(db, req, true)

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 50 {
		req.PageSize = 50
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []finishedWorkWithUserRow
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order(finishedWorkPublicOrder(req.Sort)).Offset(offset).Limit(req.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]response.FinishedWorkItem, len(rows))
	for i, row := range rows {
		urls := make([]string, 0)
		if strings.TrimSpace(row.ImageURLs) != "" {
			_ = json.Unmarshal([]byte(row.ImageURLs), &urls)
		}
		result[i] = response.FinishedWorkItem{
			ID:           row.ID,
			Title:        row.Title,
			Description:  row.Description,
			CoverURL:     row.CoverURL,
			ImageURLs:    urls,
			ImageCount:   row.ImageCount,
			Status:       row.Status,
			IsPublic:     row.IsPublic,
			ReviewStatus: row.ReviewStatus,
			ReviewReason: row.ReviewReason,
			LikeCount:    row.LikeCount,
			CommentCount: row.CommentCount,
			User: &response.FinishedWorkAuthor{
				ID:       row.UserID,
				Nickname: row.UserNickname,
				Avatar:   row.UserAvatar,
			},
			CreatedAt: row.CreatedAt,
		}
	}
	return result, total, nil
}

func (s *FinishedWorkService) ListPublicByUser(userID uint, req *request.ListFinishedWorkRequest) ([]response.FinishedWorkItem, int64, error) {
	if userID == 0 {
		return []response.FinishedWorkItem{}, 0, nil
	}

	db := global.GVA_DB.Table("finished_works fw").
		Select(`fw.*,
		COALESCE(NULLIF(u.nickname, ''), NULLIF(u.username, ''), '用户') as user_nickname,
		COALESCE(u.avatar, '') as user_avatar`).
		Joins("LEFT JOIN users u ON u.id = fw.user_id").
		Where("fw.user_id = ? AND fw.status = ? AND fw.is_public = ? AND fw.review_status = ?", userID, finishedWorkStatusActive, true, finishedWorkReviewApproved)
	db = applyFinishedWorkPublicListFilters(db, req, false)

	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 50 {
		req.PageSize = 50
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []finishedWorkWithUserRow
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order(finishedWorkPublicOrder(req.Sort)).Offset(offset).Limit(req.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]response.FinishedWorkItem, len(rows))
	for i, row := range rows {
		urls := make([]string, 0)
		if strings.TrimSpace(row.ImageURLs) != "" {
			_ = json.Unmarshal([]byte(row.ImageURLs), &urls)
		}
		result[i] = response.FinishedWorkItem{
			ID:           row.ID,
			Title:        row.Title,
			Description:  row.Description,
			CoverURL:     row.CoverURL,
			ImageURLs:    urls,
			ImageCount:   row.ImageCount,
			Status:       row.Status,
			IsPublic:     row.IsPublic,
			ReviewStatus: row.ReviewStatus,
			ReviewReason: row.ReviewReason,
			LikeCount:    row.LikeCount,
			CommentCount: row.CommentCount,
			User: &response.FinishedWorkAuthor{
				ID:       row.UserID,
				Nickname: row.UserNickname,
				Avatar:   row.UserAvatar,
			},
			CreatedAt: row.CreatedAt,
		}
	}
	return result, total, nil
}

func (s *FinishedWorkService) GetPublicByID(id uint) (*response.FinishedWorkItem, error) {
	var row finishedWorkWithUserRow
	err := global.GVA_DB.Table("finished_works fw").
		Select(`fw.*,
		COALESCE(NULLIF(u.nickname, ''), NULLIF(u.username, ''), '鐢ㄦ埛') as user_nickname,
		COALESCE(u.avatar, '') as user_avatar`).
		Joins("LEFT JOIN users u ON u.id = fw.user_id").
		Where("fw.id = ? AND fw.status = ? AND fw.is_public = ? AND fw.review_status = ?", id, finishedWorkStatusActive, true, finishedWorkReviewApproved).
		First(&row).Error
	if err != nil {
		return nil, err
	}

	urls := make([]string, 0)
	if strings.TrimSpace(row.ImageURLs) != "" {
		_ = json.Unmarshal([]byte(row.ImageURLs), &urls)
	}

	item := &response.FinishedWorkItem{
		ID:           row.ID,
		Title:        row.Title,
		Description:  row.Description,
		CoverURL:     row.CoverURL,
		ImageURLs:    urls,
		ImageCount:   row.ImageCount,
		Status:       row.Status,
		IsPublic:     row.IsPublic,
		ReviewStatus: row.ReviewStatus,
		ReviewReason: row.ReviewReason,
		LikeCount:    row.LikeCount,
		CommentCount: row.CommentCount,
		User: &response.FinishedWorkAuthor{
			ID:       row.UserID,
			Nickname: row.UserNickname,
			Avatar:   row.UserAvatar,
		},
		CreatedAt: row.CreatedAt,
	}
	return item, nil
}

func (s *FinishedWorkService) IsLiked(userID, workID uint) bool {
	if userID == 0 || workID == 0 {
		return false
	}
	var count int64
	if err := global.GVA_DB.Model(&entity.FinishedWorkLike{}).
		Where("user_id = ? AND work_id = ?", userID, workID).
		Count(&count).Error; err != nil {
		return false
	}
	return count > 0
}

func (s *FinishedWorkService) ToggleLike(userID, workID uint) (bool, int, error) {
	var work entity.FinishedWork
	if err := global.GVA_DB.Where("id = ? AND status = ? AND is_public = ? AND review_status = ?", workID, finishedWorkStatusActive, true, finishedWorkReviewApproved).First(&work).Error; err != nil {
		return false, 0, err
	}

	var liked bool
	var likeCount int64
	err := global.GVA_DB.Transaction(func(tx *gorm.DB) error {
		var existing entity.FinishedWorkLike
		findErr := tx.Where("user_id = ? AND work_id = ?", userID, workID).First(&existing).Error
		if findErr == nil {
			if err := tx.Delete(&entity.FinishedWorkLike{}, existing.ID).Error; err != nil {
				return err
			}
			if err := tx.Model(&entity.FinishedWork{}).Where("id = ?", workID).UpdateColumn("like_count", gorm.Expr("GREATEST(like_count - 1, 0)")).Error; err != nil {
				return err
			}
			liked = false
		} else {
			if !errors.Is(findErr, gorm.ErrRecordNotFound) {
				return findErr
			}
			if err := tx.Create(&entity.FinishedWorkLike{UserID: userID, WorkID: workID}).Error; err != nil {
				return err
			}
			if err := tx.Model(&entity.FinishedWork{}).Where("id = ?", workID).UpdateColumn("like_count", gorm.Expr("like_count + 1")).Error; err != nil {
				return err
			}
			liked = true
		}
		if err := tx.Model(&entity.FinishedWork{}).Select("like_count").Where("id = ?", workID).Scan(&likeCount).Error; err != nil {
			return err
		}
		return nil
	})
	return liked, int(likeCount), err
}

func (s *FinishedWorkService) ListComments(workID uint, page, pageSize int) ([]response.FinishedWorkCommentItem, int64, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 50 {
		pageSize = 50
	}

	var total int64
	base := global.GVA_DB.Model(&entity.FinishedWorkComment{}).Where("work_id = ? AND status = 1", workID)
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []entity.FinishedWorkComment
	offset := (page - 1) * pageSize
	if err := base.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	userIDs := make([]uint, 0, len(rows))
	for _, item := range rows {
		userIDs = append(userIDs, item.UserID)
	}
	userMap := s.getFinishedWorkUserMap(userIDs)

	result := make([]response.FinishedWorkCommentItem, len(rows))
	for i, row := range rows {
		result[i] = response.FinishedWorkCommentItem{
			ID:        row.ID,
			WorkID:    row.WorkID,
			Content:   row.Content,
			User:      userMap[row.UserID],
			CreatedAt: row.CreatedAt,
		}
	}
	return result, total, nil
}

func (s *FinishedWorkService) CreateComment(workID, userID uint, content string) (*response.FinishedWorkCommentItem, error) {
	var work entity.FinishedWork
	if err := global.GVA_DB.Where("id = ? AND status = ? AND is_public = ? AND review_status = ?", workID, finishedWorkStatusActive, true, finishedWorkReviewApproved).First(&work).Error; err != nil {
		return nil, err
	}
	text := strings.TrimSpace(content)
	if text == "" {
		return nil, fmt.Errorf("content is required")
	}

	item := entity.FinishedWorkComment{
		WorkID:  workID,
		UserID:  userID,
		Content: text,
		Status:  1,
	}
	if err := global.GVA_DB.Create(&item).Error; err != nil {
		return nil, err
	}
	_ = global.GVA_DB.Model(&entity.FinishedWork{}).Where("id = ?", workID).UpdateColumn("comment_count", gorm.Expr("comment_count + 1")).Error

	userMap := s.getFinishedWorkUserMap([]uint{userID})
	return &response.FinishedWorkCommentItem{
		ID:        item.ID,
		WorkID:    item.WorkID,
		Content:   item.Content,
		User:      userMap[userID],
		CreatedAt: item.CreatedAt,
	}, nil
}

func (s *FinishedWorkService) CreateReport(workID, reporterID uint, reason, detail string) error {
	var work entity.FinishedWork
	if err := global.GVA_DB.Where("id = ? AND status = ? AND is_public = ? AND review_status = ?", workID, finishedWorkStatusActive, true, finishedWorkReviewApproved).First(&work).Error; err != nil {
		return err
	}
	if work.UserID == reporterID {
		return fmt.Errorf("cannot report your own work")
	}

	r := entity.FinishedWorkReport{
		WorkID:     workID,
		ReporterID: reporterID,
		Reason:     strings.TrimSpace(reason),
		Detail:     strings.TrimSpace(detail),
		Status:     0,
	}
	return global.GVA_DB.Create(&r).Error
}

func (s *FinishedWorkService) getFinishedWorkUserMap(userIDs []uint) map[uint]response.FinishedWorkAuthor {
	result := make(map[uint]response.FinishedWorkAuthor)
	if len(userIDs) == 0 {
		return result
	}
	uniq := make(map[uint]struct{})
	cleanIDs := make([]uint, 0, len(userIDs))
	for _, id := range userIDs {
		if id == 0 {
			continue
		}
		if _, ok := uniq[id]; ok {
			continue
		}
		uniq[id] = struct{}{}
		cleanIDs = append(cleanIDs, id)
	}
	if len(cleanIDs) == 0 {
		return result
	}

	var users []entity.User
	if err := global.GVA_DB.Select("id, nickname, username, avatar").Where("id IN ?", cleanIDs).Find(&users).Error; err != nil {
		return result
	}
	for _, u := range users {
		nick := strings.TrimSpace(u.Nickname)
		if nick == "" {
			nick = strings.TrimSpace(u.Username)
		}
		if nick == "" {
			nick = "鐢ㄦ埛"
		}
		result[u.ID] = response.FinishedWorkAuthor{
			ID:       u.ID,
			Nickname: nick,
			Avatar:   strings.TrimSpace(u.Avatar),
		}
	}
	return result
}

func (s *FinishedWorkService) GetModerationWorks(req *request.FinishedWorkModerationListRequest) ([]response.FinishedWorkItem, int64, error) {
	db := global.GVA_DB.Table("finished_works fw").
		Select(`fw.*,
		COALESCE(NULLIF(u.nickname, ''), NULLIF(u.username, ''), '鐢ㄦ埛') as user_nickname,
		COALESCE(u.avatar, '') as user_avatar`).
		Joins("LEFT JOIN users u ON u.id = fw.user_id").
		Where("fw.status = ? AND fw.is_public = ?", finishedWorkStatusActive, true)
	if req.ReviewStatus >= 0 {
		db = db.Where("fw.review_status = ?", req.ReviewStatus)
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 50 {
		req.PageSize = 50
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []finishedWorkWithUserRow
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("fw.created_at DESC").Offset(offset).Limit(req.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	result := make([]response.FinishedWorkItem, len(rows))
	for i, row := range rows {
		urls := make([]string, 0)
		if strings.TrimSpace(row.ImageURLs) != "" {
			_ = json.Unmarshal([]byte(row.ImageURLs), &urls)
		}
		result[i] = response.FinishedWorkItem{
			ID:           row.ID,
			Title:        row.Title,
			Description:  row.Description,
			CoverURL:     row.CoverURL,
			ImageURLs:    urls,
			ImageCount:   row.ImageCount,
			Status:       row.Status,
			IsPublic:     row.IsPublic,
			ReviewStatus: row.ReviewStatus,
			ReviewReason: row.ReviewReason,
			LikeCount:    row.LikeCount,
			CommentCount: row.CommentCount,
			User: &response.FinishedWorkAuthor{
				ID:       row.UserID,
				Nickname: row.UserNickname,
				Avatar:   row.UserAvatar,
			},
			CreatedAt: row.CreatedAt,
		}
	}
	return result, total, nil
}

func (s *FinishedWorkService) ReviewWork(workID uint, action string, reason string) error {
	var work entity.FinishedWork
	if err := global.GVA_DB.Where("id = ? AND status = ? AND is_public = ?", workID, finishedWorkStatusActive, true).First(&work).Error; err != nil {
		return err
	}

	action = strings.TrimSpace(strings.ToLower(action))
	reason = strings.TrimSpace(reason)
	if reason == "" {
		switch action {
		case "approve":
			reason = ""
		case "reject":
			reason = "审核驳回"
		case "hide":
			reason = "管理员下架"
		case "restore":
			reason = "恢复上架"
		}
	}

	updates := map[string]interface{}{}
	switch action {
	case "approve":
		updates["review_status"] = finishedWorkReviewApproved
		updates["review_reason"] = reason
	case "reject":
		updates["review_status"] = finishedWorkReviewRejected
		updates["review_reason"] = reason
	case "hide":
		updates["review_status"] = finishedWorkReviewHidden
		updates["review_reason"] = reason
	case "restore":
		updates["review_status"] = finishedWorkReviewApproved
		updates["review_reason"] = reason
	default:
		return fmt.Errorf("invalid action")
	}

	return global.GVA_DB.Model(&entity.FinishedWork{}).Where("id = ?", workID).Updates(updates).Error
}

func (s *FinishedWorkService) GetModerationReports(req *request.FinishedWorkModerationReportListRequest) ([]response.FinishedWorkReportItem, int64, error) {
	db := global.GVA_DB.Model(&entity.FinishedWorkReport{})
	if req.Status >= 0 {
		db = db.Where("status = ?", req.Status)
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.PageSize > 50 {
		req.PageSize = 50
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var rows []entity.FinishedWorkReport
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("created_at DESC").Offset(offset).Limit(req.PageSize).Find(&rows).Error; err != nil {
		return nil, 0, err
	}

	workIDs := make([]uint, 0, len(rows))
	userIDs := make([]uint, 0, len(rows)*2)
	for _, row := range rows {
		workIDs = append(workIDs, row.WorkID)
		userIDs = append(userIDs, row.ReporterID)
		if row.HandledBy > 0 {
			userIDs = append(userIDs, row.HandledBy)
		}
	}

	workMap := make(map[uint]entity.FinishedWork)
	if len(workIDs) > 0 {
		var works []entity.FinishedWork
		if err := global.GVA_DB.Select("id, user_id, title").Where("id IN ?", workIDs).Find(&works).Error; err == nil {
			for _, w := range works {
				workMap[w.ID] = w
				userIDs = append(userIDs, w.UserID)
			}
		}
	}

	userMap := s.getFinishedWorkUserMap(userIDs)
	result := make([]response.FinishedWorkReportItem, len(rows))
	for i, row := range rows {
		work := workMap[row.WorkID]
		handledName := ""
		if row.HandledBy > 0 {
			handledName = userMap[row.HandledBy].Nickname
		}
		handledAt := time.Time{}
		if row.HandledAt != nil {
			handledAt = *row.HandledAt
		}

		result[i] = response.FinishedWorkReportItem{
			ID:               row.ID,
			WorkID:           row.WorkID,
			WorkTitle:        work.Title,
			WorkOwnerID:      work.UserID,
			ReporterID:       row.ReporterID,
			ReporterNickname: userMap[row.ReporterID].Nickname,
			Reason:           row.Reason,
			Detail:           row.Detail,
			Status:           row.Status,
			HandleNote:       row.HandleNote,
			HandledBy:        row.HandledBy,
			HandledByName:    handledName,
			HandledAt:        handledAt,
			CreatedAt:        row.CreatedAt,
		}
	}
	return result, total, nil
}

func (s *FinishedWorkService) HandleReport(reportID uint, adminID uint, action string, note string) error {
	var report entity.FinishedWorkReport
	if err := global.GVA_DB.First(&report, reportID).Error; err != nil {
		return err
	}
	if report.Status != 0 {
		return fmt.Errorf("report already handled")
	}

	action = strings.TrimSpace(strings.ToLower(action))
	note = strings.TrimSpace(note)
	if action != "accept" && action != "reject" {
		return fmt.Errorf("invalid action")
	}
	status := 2
	if action == "accept" {
		status = 1
	}

	now := time.Now()
	return global.GVA_DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&entity.FinishedWorkReport{}).Where("id = ?", report.ID).Updates(map[string]interface{}{
			"status":      status,
			"handle_note": note,
			"handled_by":  adminID,
			"handled_at":  now,
		}).Error; err != nil {
			return err
		}

		if action == "accept" {
			if err := tx.Model(&entity.FinishedWork{}).Where("id = ?", report.WorkID).Updates(map[string]interface{}{
				"review_status": finishedWorkReviewHidden,
				"review_reason": "举报采纳下架",
			}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
