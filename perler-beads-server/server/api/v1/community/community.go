package community

import (
	"os"
	"perler-beads-server/model/request"
	"perler-beads-server/model/response"
	"perler-beads-server/service"
	"perler-beads-server/utils"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type CommunityApi struct{}

var communityService = service.CommunityService{}

func (co *CommunityApi) GetPosts(c *gin.Context) {
	var req request.CommunityPostListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("invalid params", c)
		return
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	list, total, err := communityService.GetPosts(&req)
	if err != nil {
		response.FailWithMessage("failed to fetch posts", c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (co *CommunityApi) GetPost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("invalid post id", c)
		return
	}

	detail, err := communityService.GetPostByID(uint(id))
	if err != nil {
		response.FailWithMessage("failed to fetch post", c)
		return
	}
	if detail == nil {
		response.FailWithMessage("post not found or hidden", c)
		return
	}

	userID := tryGetUserID(c)
	if userID > 0 {
		detail.Liked = communityService.IsLiked(userID, uint(id))
	}

	response.OkWithDetailed(detail, "ok", c)
}

func (co *CommunityApi) MakePost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("invalid post id", c)
		return
	}

	if err := communityService.IncrementMakeCount(uint(id)); err != nil {
		response.FailWithMessage("operation failed", c)
		return
	}
	response.OkWithMessage("ok", c)
}

func (co *CommunityApi) CreatePost(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}

	var req request.CreateCommunityPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}

	post, updatedExisting, err := communityService.CreatePost(&req, userID)
	if err != nil {
		response.FailWithMessage("publish failed: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(gin.H{
		"id":               post.ID,
		"title":            post.Title,
		"category":         post.Category,
		"thumbnail_url":    post.ThumbnailURL,
		"preview_url":      post.PreviewURL,
		"updated_existing": updatedExisting,
	}, "ok", c)
}

func (co *CommunityApi) GetMyPosts(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}

	var req request.CommunityMyPostListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("invalid params", c)
		return
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.ReviewStatus < -1 || req.ReviewStatus > 3 {
		req.ReviewStatus = -1
	}

	list, total, err := communityService.GetMyPosts(userID, &req)
	if err != nil {
		response.FailWithMessage("failed to fetch my posts: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (co *CommunityApi) LikePost(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}

	idStr := c.Param("id")
	postID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("invalid post id", c)
		return
	}

	result, err := communityService.ToggleLike(userID, uint(postID))
	if err != nil {
		response.FailWithMessage("operation failed", c)
		return
	}

	response.OkWithDetailed(result, "ok", c)
}

func (co *CommunityApi) Comment(c *gin.Context) {
	response.OkWithMessage("comment api is not implemented yet", c)
}

func (co *CommunityApi) ReportPost(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}

	idStr := c.Param("id")
	postID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("invalid post id", c)
		return
	}

	var req request.CreateCommunityReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}

	if err := communityService.CreateReport(uint(postID), userID, req.Reason, req.Detail, req.EvidenceURLs); err != nil {
		response.FailWithMessage("report failed: "+err.Error(), c)
		return
	}

	response.OkWithMessage("report submitted", c)
}

func (co *CommunityApi) GetModerationPosts(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	var req request.CommunityModerationListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("invalid params", c)
		return
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.ReviewStatus < 0 {
		req.ReviewStatus = -1
	}

	list, total, err := communityService.GetModerationPosts(&req)
	if err != nil {
		response.FailWithMessage("failed to fetch moderation posts", c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (co *CommunityApi) GetModerationLogs(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	var req request.CommunityModerationLogListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("invalid params", c)
		return
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	list, total, err := communityService.GetModerationLogs(&req)
	if err != nil {
		response.FailWithMessage("failed to fetch moderation logs", c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (co *CommunityApi) GetModerationStats(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	stats, err := communityService.GetModerationStats()
	if err != nil {
		response.FailWithMessage("failed to fetch moderation stats: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(stats, "ok", c)
}

func (co *CommunityApi) GetModerationReports(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	var req request.CommunityModerationReportListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("invalid params", c)
		return
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}
	if req.Status < -1 || req.Status > 2 {
		req.Status = 0
	}

	list, total, err := communityService.GetModerationReports(&req)
	if err != nil {
		response.FailWithMessage("failed to fetch reports: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (co *CommunityApi) GetReportAlerts(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	limit := 10
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil {
			limit = v
		}
	}

	list, err := communityService.GetReportAlerts(limit)
	if err != nil {
		response.FailWithMessage("failed to fetch report alerts: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(gin.H{
		"list":  list,
		"limit": limit,
	}, "ok", c)
}

func (co *CommunityApi) HandleReport(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	idStr := c.Param("id")
	reportID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("invalid report id", c)
		return
	}

	var req request.HandleCommunityReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}

	if err := communityService.HandleReport(uint(reportID), userID, req.Action, req.Note); err != nil {
		response.FailWithMessage("handle failed: "+err.Error(), c)
		return
	}

	response.OkWithMessage("ok", c)
}

func (co *CommunityApi) BatchHandleReports(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	var req request.BatchHandleCommunityReportsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}

	handled, err := communityService.BatchHandleReports(req.ReportIDs, userID, req.Action, req.Note)
	if err != nil {
		response.FailWithMessage("batch handle failed: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(gin.H{
		"handled_count": handled,
	}, "ok", c)
}

func (co *CommunityApi) BackfillMissingPreviews(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	var req request.CommunityPreviewBackfillRequest
	_ = c.ShouldBindJSON(&req)
	if req.Limit <= 0 {
		req.Limit = 100
	}

	count, err := communityService.BackfillMissingPreviews(req.Limit)
	if err != nil {
		response.FailWithMessage("backfill failed: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(gin.H{
		"updated_count": count,
		"limit":         req.Limit,
	}, "ok", c)
}

func (co *CommunityApi) ReviewPost(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isCommunityAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("invalid post id", c)
		return
	}

	var req request.ReviewCommunityPostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}

	if err := communityService.ReviewPost(uint(id), userID, req.Action, strings.TrimSpace(req.Reason)); err != nil {
		response.FailWithMessage("review failed: "+err.Error(), c)
		return
	}

	response.OkWithMessage("ok", c)
}

func isCommunityAdmin(userID uint) bool {
	if userID == 0 {
		return false
	}

	raw := strings.TrimSpace(os.Getenv("COMMUNITY_ADMIN_IDS"))
	if raw == "" {
		return userID == 2 || userID == 4
	}

	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		id, err := strconv.ParseUint(part, 10, 32)
		if err != nil {
			continue
		}
		if uint(id) == userID {
			return true
		}
	}
	return false
}

func tryGetUserID(c *gin.Context) uint {
	token := c.Request.Header.Get("Authorization")
	if token == "" {
		token = c.Request.Header.Get("x-token")
	}
	if token == "" {
		return 0
	}
	if strings.HasPrefix(token, "Bearer ") {
		token = token[7:]
	}

	j := utils.NewJWT()
	claims, err := j.ParseToken(token)
	if err != nil {
		return 0
	}
	return claims.UserID
}
