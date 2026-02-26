package service

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"perler-beads-server/global"
	"perler-beads-server/model/entity"
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"strings"
)

type CommunityService struct{}

// GetPosts 获取社区作品列表（不含 bead_data）
func (s *CommunityService) GetPosts(req *request.CommunityPostListRequest) ([]response.CommunityPostListItem, int64, error) {
	db := global.GVA_DB.Model(&entity.CommunityPost{}).Where("community_posts.status = ?", 1)

	// 总数
	var total int64
	db.Count(&total)

	// 分页
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	var posts []entity.CommunityPost
	offset := (req.Page - 1) * req.PageSize
	if err := db.Order("community_posts.created_at DESC").Offset(offset).Limit(req.PageSize).Find(&posts).Error; err != nil {
		return nil, 0, err
	}

	// 收集 userID，批量查询用户信息
	userIDs := make([]uint, 0, len(posts))
	for _, p := range posts {
		userIDs = append(userIDs, p.UserID)
	}
	userMap := s.getUserMap(userIDs)

	// 转换响应
	result := make([]response.CommunityPostListItem, len(posts))
	for i, p := range posts {
		result[i] = response.CommunityPostListItem{
			ID:           p.ID,
			Title:        p.Title,
			ThumbnailURL: p.ThumbnailURL,
			GridWidth:    p.GridWidth,
			GridHeight:   p.GridHeight,
			ColorCount:   p.ColorCount,
			Difficulty:   p.Difficulty,
			LikeCount:    p.LikeCount,
			ViewCount:    p.ViewCount,
			MakeCount:    p.MakeCount,
			User:         userMap[p.UserID],
			CreatedAt:    p.CreatedAt,
		}
	}

	return result, total, nil
}

// GetPostByID 获取作品详情（含 bead_data），同时 view_count + 1
func (s *CommunityService) GetPostByID(id uint) (*response.CommunityPostDetail, error) {
	var post entity.CommunityPost
	if err := global.GVA_DB.First(&post, id).Error; err != nil {
		return nil, err
	}

	// 只返回 status=1 的作品
	if post.Status != 1 {
		return nil, nil
	}

	// view_count + 1（异步不阻塞，忽略错误）
	go func() {
		global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", id).
			UpdateColumn("view_count", global.GVA_DB.Raw("view_count + 1"))
	}()

	// 获取作者信息
	userMap := s.getUserMap([]uint{post.UserID})

	// 解析 image_urls：entity.JSON 是 map[string]interface{}，需要先 marshal 再 unmarshal 为 []string
	var imageURLs []string
	if post.ImageURLs != nil {
		if raw, err := json.Marshal(post.ImageURLs); err == nil {
			_ = json.Unmarshal(raw, &imageURLs)
		}
	}

	// bead_data 直接使用，entity.JSON 本身就是 map[string]interface{}
	beadData := map[string]interface{}(post.BeadData)

	return &response.CommunityPostDetail{
		ID:           post.ID,
		Title:        post.Title,
		Description:  post.Description,
		ThumbnailURL: post.ThumbnailURL,
		ImageURLs:    imageURLs,
		BeadData:     beadData,
		GridWidth:    post.GridWidth,
		GridHeight:   post.GridHeight,
		BeadCount:    post.BeadCount,
		ColorCount:   post.ColorCount,
		Difficulty:   post.Difficulty,
		LikeCount:    post.LikeCount,
		ViewCount:    post.ViewCount + 1, // 返回 +1 后的值
		MakeCount:    post.MakeCount,
		User:         userMap[post.UserID],
		CreatedAt:    post.CreatedAt,
	}, nil
}

// CreatePost 发布社区作品
func (s *CommunityService) CreatePost(req *request.CreateCommunityPostRequest, userID uint) (*entity.CommunityPost, error) {
	// 构建 beadData 为 entity.JSON
	beadData := entity.JSON(req.BeadData)

	// 难度默认值
	difficulty := req.Difficulty
	if difficulty == "" {
		difficulty = "medium"
	}

	post := entity.CommunityPost{
		UserID:      userID,
		ProjectID:   req.ProjectID,
		Title:       req.Title,
		Description: req.Description,
		BeadData:    beadData,
		GridWidth:   req.GridWidth,
		GridHeight:  req.GridHeight,
		BeadCount:   req.BeadCount,
		ColorCount:  req.ColorCount,
		Difficulty:  difficulty,
		Status:      1, // 直接上线
	}

	// 先创建记录，获得 ID
	if err := global.GVA_DB.Create(&post).Error; err != nil {
		return nil, err
	}

	// 处理缩略图 base64
	if req.ThumbnailBase64 != "" {
		thumbnailURL, err := s.saveThumbnail(post.ID, req.ThumbnailBase64)
		if err != nil {
			global.GVA_LOG.Error("保存缩略图失败: " + err.Error())
		} else {
			post.ThumbnailURL = thumbnailURL
			global.GVA_DB.Model(&post).UpdateColumn("thumbnail_url", thumbnailURL)
		}
	}

	return &post, nil
}

// saveThumbnail 保存缩略图 base64 为 PNG 文件
func (s *CommunityService) saveThumbnail(postID uint, base64Str string) (string, error) {
	// 去掉 data:image/png;base64, 前缀
	if idx := strings.Index(base64Str, ","); idx != -1 {
		base64Str = base64Str[idx+1:]
	}

	// 解码
	data, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil {
		return "", fmt.Errorf("base64 decode failed: %w", err)
	}

	// 确保目录存在
	dir := "/www/wwwroot/perler-beads/thumbnails"
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("mkdir failed: %w", err)
	}

	// 写入文件
	filename := fmt.Sprintf("post_%d.png", postID)
	filePath := filepath.Join(dir, filename)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return "", fmt.Errorf("write file failed: %w", err)
	}

	return "/thumbnails/" + filename, nil
}

// ToggleLike 切换点赞状态
func (s *CommunityService) ToggleLike(userID, postID uint) (*response.LikeResponse, error) {
	var like entity.CommunityLike
	result := global.GVA_DB.Where("user_id = ? AND post_id = ?", userID, postID).First(&like)

	if result.Error == nil {
		// 已点赞 → 取消
		global.GVA_DB.Delete(&like)
		global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ? AND like_count > 0", postID).
			UpdateColumn("like_count", global.GVA_DB.Raw("like_count - 1"))

		// 查询最新点赞数
		var post entity.CommunityPost
		global.GVA_DB.Select("like_count").First(&post, postID)

		return &response.LikeResponse{Liked: false, LikeCount: post.LikeCount}, nil
	}

	// 未点赞 → 添加
	like = entity.CommunityLike{UserID: userID, PostID: postID}
	if err := global.GVA_DB.Create(&like).Error; err != nil {
		return nil, err
	}
	global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", postID).
		UpdateColumn("like_count", global.GVA_DB.Raw("like_count + 1"))

	// 查询最新点赞数
	var post entity.CommunityPost
	global.GVA_DB.Select("like_count").First(&post, postID)

	return &response.LikeResponse{Liked: true, LikeCount: post.LikeCount}, nil
}

// IsLiked 查询用户是否已点赞
func (s *CommunityService) IsLiked(userID, postID uint) bool {
	var count int64
	global.GVA_DB.Model(&entity.CommunityLike{}).
		Where("user_id = ? AND post_id = ?", userID, postID).
		Count(&count)
	return count > 0
}

// IncrementMakeCount 增加制作次数
func (s *CommunityService) IncrementMakeCount(id uint) error {
	return global.GVA_DB.Model(&entity.CommunityPost{}).Where("id = ?", id).
		UpdateColumn("make_count", global.GVA_DB.Raw("make_count + 1")).Error
}

// getUserMap 批量获取用户信息映射
func (s *CommunityService) getUserMap(userIDs []uint) map[uint]response.CommunityPostAuthor {
	m := make(map[uint]response.CommunityPostAuthor)
	if len(userIDs) == 0 {
		return m
	}

	var users []entity.User
	global.GVA_DB.Select("id, nickname, avatar").Where("id IN ?", userIDs).Find(&users)

	for _, u := range users {
		m[u.ID] = response.CommunityPostAuthor{
			ID:       u.ID,
			Nickname: u.Nickname,
			Avatar:   u.Avatar,
		}
	}
	return m
}
