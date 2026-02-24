package service

import (
	"errors"
	"perler-game-server/global"
	"perler-game-server/model/entity"
	"perler-game-server/model/request"
	"perler-game-server/model/response"
	"time"
)

type ChallengeService struct{}

var ChallengeServiceApp = new(ChallengeService)

// GetDailyChallenges 获取今日挑战（基于日期种子选3个）
func (s *ChallengeService) GetDailyChallenges() ([]response.ChallengeItem, error) {
	var challenges []entity.Challenge
	if err := global.GVA_DB.Where("is_active = ?", true).Find(&challenges).Error; err != nil {
		return nil, err
	}

	if len(challenges) == 0 {
		return []response.ChallengeItem{}, nil
	}

	// 基于日期种子选取
	now := time.Now()
	seed := now.Year()*10000 + int(now.Month())*100 + now.Day()
	selected := selectByHash(challenges, seed, 3)

	return toItems(selected), nil
}

// GetWeeklyChallenges 获取本周挑战（选2个困难）
func (s *ChallengeService) GetWeeklyChallenges() ([]response.ChallengeItem, error) {
	var challenges []entity.Challenge
	if err := global.GVA_DB.Where("is_active = ? AND difficulty = ?", true, "hard").Find(&challenges).Error; err != nil {
		return nil, err
	}

	if len(challenges) == 0 {
		return []response.ChallengeItem{}, nil
	}

	now := time.Now()
	_, week := now.ISOWeek()
	seed := now.Year()*100 + week
	selected := selectByHash(challenges, seed, 2)

	return toItems(selected), nil
}

// Submit 提交挑战结果
func (s *ChallengeService) Submit(userID uint, req *request.ChallengeSubmitReq) error {
	// 查找挑战
	var challenge entity.Challenge
	if err := global.GVA_DB.Where("code = ?", req.ChallengeCode).First(&challenge).Error; err != nil {
		return errors.New("挑战不存在")
	}

	record := entity.UserChallenge{
		UserID:      userID,
		ChallengeID: challenge.ID,
		Passed:      req.Passed,
		Score:       req.Score,
		TimeUsed:    req.TimeUsed,
		BonusJSON:   req.BonusJSON,
	}

	return global.GVA_DB.Create(&record).Error
}

// GetLeaderboard 挑战排行榜
func (s *ChallengeService) GetLeaderboard(challengeID uint, limit int) ([]response.LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 20
	}

	type row struct {
		UserID   uint
		Score    int
		TimeUsed float64
		Nickname string
		Avatar   string
	}

	var rows []row
	err := global.GVA_DB.Table("user_challenges").
		Select("user_challenges.user_id, user_challenges.score, user_challenges.time_used, users.nickname, users.avatar").
		Joins("LEFT JOIN users ON users.id = user_challenges.user_id").
		Where("user_challenges.challenge_id = ? AND user_challenges.passed = ?", challengeID, true).
		Order("user_challenges.score DESC, user_challenges.time_used ASC").
		Limit(limit).
		Find(&rows).Error

	if err != nil {
		return nil, err
	}

	entries := make([]response.LeaderboardEntry, len(rows))
	for i, r := range rows {
		entries[i] = response.LeaderboardEntry{
			Rank:         i + 1,
			UserID:       r.UserID,
			UserNickname: r.Nickname,
			UserAvatar:   r.Avatar,
			Score:        r.Score,
			TimeUsed:     r.TimeUsed,
		}
	}
	return entries, nil
}

// GetMyRecords 获取我的挑战记录
func (s *ChallengeService) GetMyRecords(userID uint, page, pageSize int) (*response.PageResult, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}

	type row struct {
		ID            uint
		ChallengeCode string
		ChallengeName string
		Passed        bool
		Score         int
		TimeUsed      float64
		CreatedAt     time.Time
	}

	var total int64
	global.GVA_DB.Table("user_challenges").Where("user_id = ?", userID).Count(&total)

	var rows []row
	err := global.GVA_DB.Table("user_challenges").
		Select("user_challenges.id, challenges.code as challenge_code, challenges.name as challenge_name, user_challenges.passed, user_challenges.score, user_challenges.time_used, user_challenges.created_at").
		Joins("LEFT JOIN challenges ON challenges.id = user_challenges.challenge_id").
		Where("user_challenges.user_id = ?", userID).
		Order("user_challenges.created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&rows).Error

	if err != nil {
		return nil, err
	}

	items := make([]response.UserChallengeRecord, len(rows))
	for i, r := range rows {
		items[i] = response.UserChallengeRecord{
			ID:            r.ID,
			ChallengeCode: r.ChallengeCode,
			ChallengeName: r.ChallengeName,
			Passed:        r.Passed,
			Score:         r.Score,
			TimeUsed:      r.TimeUsed,
			CreatedAt:     r.CreatedAt,
		}
	}

	return &response.PageResult{
		List:     items,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

// ===== 辅助函数 =====

func selectByHash(items []entity.Challenge, seed int, count int) []entity.Challenge {
	if len(items) <= count {
		return items
	}
	// 简单Fisher-Yates
	pool := make([]entity.Challenge, len(items))
	copy(pool, items)
	for i := len(pool) - 1; i > 0; i-- {
		j := (seed * (i + 1) * 7) % (i + 1)
		if j < 0 {
			j = -j
		}
		pool[i], pool[j] = pool[j], pool[i]
	}
	return pool[:count]
}

func toItems(challenges []entity.Challenge) []response.ChallengeItem {
	items := make([]response.ChallengeItem, len(challenges))
	for i, c := range challenges {
		items[i] = response.ChallengeItem{
			ID:          c.ID,
			Code:        c.Code,
			Name:        c.Name,
			Description: c.Description,
			Type:        c.Type,
			Icon:        c.Icon,
			Difficulty:  c.Difficulty,
			Constraints: c.Constraints,
			Scoring:     c.Scoring,
			TemplateID:  c.TemplateID,
			BoardWidth:  c.BoardWidth,
			BoardHeight: c.BoardHeight,
		}
	}
	return items
}
