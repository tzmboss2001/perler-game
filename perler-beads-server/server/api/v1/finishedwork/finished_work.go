package finishedwork

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

type FinishedWorkApi struct{}

var finishedWorkService = service.FinishedWorkServiceApp

func (a *FinishedWorkApi) Create(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}

	var req request.CreateFinishedWorkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}

	item, err := finishedWorkService.Create(userID, &req)
	if err != nil {
		response.FailWithMessage("create failed: "+err.Error(), c)
		return
	}
	response.OkWithDetailed(item, "ok", c)
}

func (a *FinishedWorkApi) ListMy(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}

	var req request.ListFinishedWorkRequest
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

	list, total, err := finishedWorkService.ListMy(userID, &req)
	if err != nil {
		response.FailWithMessage("fetch failed: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (a *FinishedWorkApi) Delete(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("invalid id", c)
		return
	}

	if err := finishedWorkService.Delete(userID, uint(id)); err != nil {
		response.FailWithMessage("delete failed: "+err.Error(), c)
		return
	}
	response.OkWithMessage("ok", c)
}

func (a *FinishedWorkApi) ListPublic(c *gin.Context) {
	var req request.ListFinishedWorkRequest
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

	list, total, err := finishedWorkService.ListPublic(&req)
	if err != nil {
		response.FailWithMessage("fetch failed: "+err.Error(), c)
		return
	}

	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (a *FinishedWorkApi) GetPublicByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		response.FailWithMessage("invalid id", c)
		return
	}

	item, err := finishedWorkService.GetPublicByID(uint(id))
	if err != nil {
		response.FailWithMessage("fetch failed: "+err.Error(), c)
		return
	}
	userID := tryGetUserID(c)
	if userID > 0 {
		item.Liked = finishedWorkService.IsLiked(userID, uint(id))
	}
	response.OkWithDetailed(item, "ok", c)
}

func (a *FinishedWorkApi) ToggleLike(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.FailWithMessage("invalid id", c)
		return
	}
	liked, likeCount, err := finishedWorkService.ToggleLike(userID, uint(id))
	if err != nil {
		response.FailWithMessage("operation failed: "+err.Error(), c)
		return
	}
	response.OkWithDetailed(gin.H{
		"liked":      liked,
		"like_count": likeCount,
	}, "ok", c)
}

func (a *FinishedWorkApi) Report(c *gin.Context) {
	userID := c.GetUint("userID")
	if userID == 0 {
		response.FailWithMessage("unauthorized", c)
		return
	}
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		response.FailWithMessage("invalid id", c)
		return
	}
	var req request.CreateFinishedWorkReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}
	if err := finishedWorkService.CreateReport(uint(id), userID, req.Reason, req.Detail); err != nil {
		response.FailWithMessage("report failed: "+err.Error(), c)
		return
	}
	response.OkWithMessage("report submitted", c)
}

func (a *FinishedWorkApi) GetModerationReports(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isFinishedWorkAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	var req request.FinishedWorkModerationReportListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("invalid params", c)
		return
	}
	if req.Status < -1 || req.Status > 2 {
		req.Status = -1
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	list, total, err := finishedWorkService.GetModerationReports(&req)
	if err != nil {
		response.FailWithMessage("fetch failed: "+err.Error(), c)
		return
	}
	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (a *FinishedWorkApi) HandleReport(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isFinishedWorkAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}
	reportID, err := strconv.ParseUint(c.Param("reportId"), 10, 32)
	if err != nil {
		response.FailWithMessage("invalid report id", c)
		return
	}

	var req request.HandleFinishedWorkReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}
	if err := finishedWorkService.HandleReport(uint(reportID), userID, req.Action, req.Note); err != nil {
		response.FailWithMessage("handle failed: "+err.Error(), c)
		return
	}
	response.OkWithMessage("ok", c)
}

func (a *FinishedWorkApi) GetModerationWorks(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isFinishedWorkAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	var req request.FinishedWorkModerationListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.FailWithMessage("invalid params", c)
		return
	}
	if req.ReviewStatus < -1 || req.ReviewStatus > 3 {
		req.ReviewStatus = -1
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	list, total, err := finishedWorkService.GetModerationWorks(&req)
	if err != nil {
		response.FailWithMessage("fetch failed: "+err.Error(), c)
		return
	}
	response.OkWithDetailed(response.PageResult{
		List:     list,
		Total:    total,
		Page:     req.Page,
		PageSize: req.PageSize,
	}, "ok", c)
}

func (a *FinishedWorkApi) ReviewWork(c *gin.Context) {
	userID := c.GetUint("userID")
	if !isFinishedWorkAdmin(userID) {
		response.FailWithMessage("forbidden", c)
		return
	}

	workID, err := strconv.ParseUint(c.Param("workId"), 10, 32)
	if err != nil {
		response.FailWithMessage("invalid work id", c)
		return
	}
	var req request.ReviewFinishedWorkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("invalid params: "+err.Error(), c)
		return
	}

	if err := finishedWorkService.ReviewWork(uint(workID), req.Action, req.Reason); err != nil {
		response.FailWithMessage("review failed: "+err.Error(), c)
		return
	}
	response.OkWithMessage("ok", c)
}

func isFinishedWorkAdmin(userID uint) bool {
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
	token = strings.TrimSpace(token)
	if token == "" {
		return 0
	}
	if strings.HasPrefix(strings.ToLower(token), "bearer ") {
		token = strings.TrimSpace(token[7:])
	}

	j := utils.NewJWT()
	claims, err := j.ParseToken(token)
	if err != nil || claims == nil {
		return 0
	}
	return claims.UserID
}
