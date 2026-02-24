package service

import (
	"errors"
	"perler-game-server/global"
	"perler-game-server/model/entity"
	"perler-game-server/model/request"
	"perler-game-server/model/response"

	"gorm.io/gorm"
)

type AchievementService struct{}

var AchievementServiceApp = new(AchievementService)

// GetMyAchievements 获取我的已解锁成就
func (s *AchievementService) GetMyAchievements(userID uint) ([]response.AchievementItem, error) {
	var achievements []entity.UserAchievement
	if err := global.GVA_DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&achievements).Error; err != nil {
		return nil, err
	}

	items := make([]response.AchievementItem, len(achievements))
	for i, a := range achievements {
		items[i] = response.AchievementItem{
			AchievementID: a.AchievementID,
			UnlockedAt:    a.CreatedAt,
		}
	}
	return items, nil
}

// UnlockAchievement 解锁成就
func (s *AchievementService) UnlockAchievement(userID uint, achievementID string) error {
	achievement := entity.UserAchievement{
		UserID:        userID,
		AchievementID: achievementID,
	}

	// 使用 FirstOrCreate 防止重复解锁
	result := global.GVA_DB.Where("user_id = ? AND achievement_id = ?", userID, achievementID).
		FirstOrCreate(&achievement)

	if result.Error != nil {
		return errors.New("解锁成就失败")
	}

	return nil
}

// GetMyStats 获取我的统计数据
func (s *AchievementService) GetMyStats(userID uint) (*response.UserStatsResp, error) {
	var stats entity.UserStats
	result := global.GVA_DB.Where("user_id = ?", userID).First(&stats)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// 没有记录则返回全零
			return &response.UserStatsResp{}, nil
		}
		return nil, result.Error
	}

	return &response.UserStatsResp{
		TotalCrashes:          stats.TotalCrashes,
		CrashUndercooked:      stats.CrashUndercooked,
		CrashPartialMelt:      stats.CrashPartialMelt,
		CrashCollapse:         stats.CrashCollapse,
		CrashBurned:           stats.CrashBurned,
		CrashSticky:           stats.CrashSticky,
		TotalWorks:            stats.TotalWorks,
		PerfectScores:         stats.PerfectScores,
		TotalLikesReceived:    stats.TotalLikesReceived,
		TotalComments:         stats.TotalComments,
		RescueSuccessCount:    stats.RescueSuccessCount,
		FastIroningCount:      stats.FastIroningCount,
		ChallengeCompleteCount: stats.ChallengeCompleteCount,
	}, nil
}

// UpdateStats 更新统计数据（增量或覆盖）
func (s *AchievementService) UpdateStats(userID uint, req *request.StatsUpdateReq) error {
	var stats entity.UserStats
	result := global.GVA_DB.Where("user_id = ?", userID).First(&stats)

	if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		// 创建新记录
		stats = entity.UserStats{UserID: userID}
	} else if result.Error != nil {
		return result.Error
	}

	// 用请求中非nil的字段覆盖
	if req.TotalCrashes != nil {
		stats.TotalCrashes = *req.TotalCrashes
	}
	if req.CrashUndercooked != nil {
		stats.CrashUndercooked = *req.CrashUndercooked
	}
	if req.CrashPartialMelt != nil {
		stats.CrashPartialMelt = *req.CrashPartialMelt
	}
	if req.CrashCollapse != nil {
		stats.CrashCollapse = *req.CrashCollapse
	}
	if req.CrashBurned != nil {
		stats.CrashBurned = *req.CrashBurned
	}
	if req.CrashSticky != nil {
		stats.CrashSticky = *req.CrashSticky
	}
	if req.TotalWorks != nil {
		stats.TotalWorks = *req.TotalWorks
	}
	if req.PerfectScores != nil {
		stats.PerfectScores = *req.PerfectScores
	}
	if req.TotalLikesReceived != nil {
		stats.TotalLikesReceived = *req.TotalLikesReceived
	}
	if req.TotalComments != nil {
		stats.TotalComments = *req.TotalComments
	}
	if req.RescueSuccessCount != nil {
		stats.RescueSuccessCount = *req.RescueSuccessCount
	}
	if req.FastIroningCount != nil {
		stats.FastIroningCount = *req.FastIroningCount
	}
	if req.ChallengeCompleteCount != nil {
		stats.ChallengeCompleteCount = *req.ChallengeCompleteCount
	}

	return global.GVA_DB.Save(&stats).Error
}
