package service

import (
	"strings"

	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/response"
)

type UserPublicService struct{}

var UserPublicServiceApp = new(UserPublicService)

func (s *UserPublicService) GetPublicProfile(userID uint) (*response.UserPublicProfile, error) {
	if userID == 0 {
		return nil, nil
	}

	var user entity.User
	if err := global.GVA_DB.Select("id, nickname, username, avatar, created_at, status").First(&user, userID).Error; err != nil {
		return nil, err
	}

	nickname := strings.TrimSpace(user.Nickname)
	if nickname == "" {
		nickname = strings.TrimSpace(user.Username)
	}
	if nickname == "" {
		nickname = "用户"
	}

	var communityPostCount int64
	_ = global.GVA_DB.Model(&entity.CommunityPost{}).
		Where("user_id = ? AND status = ? AND review_status = ?", userID, 1, 1).
		Count(&communityPostCount).Error

	var finishedWorkCount int64
	_ = global.GVA_DB.Model(&entity.FinishedWork{}).
		Where("user_id = ? AND status = ? AND is_public = ? AND review_status = ?", userID, finishedWorkStatusActive, true, finishedWorkReviewApproved).
		Count(&finishedWorkCount).Error

	type sumRow struct {
		LikeCount int64
		MakeCount int64
	}

	var communitySums sumRow
	_ = global.GVA_DB.Model(&entity.CommunityPost{}).
		Select("COALESCE(SUM(like_count), 0) AS like_count, COALESCE(SUM(make_count), 0) AS make_count").
		Where("user_id = ? AND status = ? AND review_status = ?", userID, 1, 1).
		Scan(&communitySums).Error

	type finishedSumRow struct {
		LikeCount int64
	}
	var finishedSums finishedSumRow
	_ = global.GVA_DB.Model(&entity.FinishedWork{}).
		Select("COALESCE(SUM(like_count), 0) AS like_count").
		Where("user_id = ? AND status = ? AND is_public = ? AND review_status = ?", userID, finishedWorkStatusActive, true, finishedWorkReviewApproved).
		Scan(&finishedSums).Error

	return &response.UserPublicProfile{
		ID:                 user.ID,
		Nickname:           nickname,
		Avatar:             strings.TrimSpace(user.Avatar),
		Bio:                "",
		CommunityPostCount: communityPostCount,
		FinishedWorkCount:  finishedWorkCount,
		TotalLikeCount:     communitySums.LikeCount + finishedSums.LikeCount,
		TotalMakeCount:     communitySums.MakeCount,
		JoinedAt:           user.CreatedAt,
	}, nil
}
