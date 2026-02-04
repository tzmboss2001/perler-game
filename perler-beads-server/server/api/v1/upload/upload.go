package upload

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"perler-beads-server/utils/upload"
)

// UploadApi 上传接口
type UploadApi struct{}

// UploadImageReq 上传图片请求
type UploadImageReq struct {
	Image  string `json:"image" binding:"required"`  // Base64图片数据
	Folder string `json:"folder"`                    // 存储目录，默认 images
}

// UploadImageResp 上传图片响应
type UploadImageResp struct {
	URL string `json:"url"` // 图片URL
}

// UploadImage 上传Base64图片到腾讯云COS
// @Summary 上传图片
// @Description 上传Base64编码的图片到腾讯云COS
// @Tags 上传
// @Accept json
// @Produce json
// @Param data body UploadImageReq true "图片数据"
// @Success 200 {object} map[string]interface{} "返回图片URL"
// @Router /upload/image [post]
func (u *UploadApi) UploadImage(c *gin.Context) {
	var req UploadImageReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 7,
			"msg":  "参数错误: " + err.Error(),
			"data": gin.H{},
		})
		return
	}

	// 默认目录
	folder := req.Folder
	if folder == "" {
		folder = "images"
	}

	// 上传到COS
	cos := upload.NewTencentCOS()
	url, err := cos.UploadBase64(req.Image, folder)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 7,
			"msg":  "上传失败: " + err.Error(),
			"data": gin.H{},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "上传成功",
		"data": UploadImageResp{URL: url},
	})
}

// UploadMultipleReq 批量上传请求
type UploadMultipleReq struct {
	Images []struct {
		Image  string `json:"image"`  // Base64图片数据
		Folder string `json:"folder"` // 存储目录
	} `json:"images" binding:"required"`
}

// UploadMultipleResp 批量上传响应
type UploadMultipleResp struct {
	URLs []string `json:"urls"` // 图片URL列表
}

// UploadMultiple 批量上传图片
// @Summary 批量上传图片
// @Description 批量上传Base64编码的图片到腾讯云COS
// @Tags 上传
// @Accept json
// @Produce json
// @Param data body UploadMultipleReq true "图片数据列表"
// @Success 200 {object} map[string]interface{} "返回图片URL列表"
// @Router /upload/multiple [post]
func (u *UploadApi) UploadMultiple(c *gin.Context) {
	var req UploadMultipleReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 7,
			"msg":  "参数错误: " + err.Error(),
			"data": gin.H{},
		})
		return
	}

	cos := upload.NewTencentCOS()
	var urls []string

	for _, img := range req.Images {
		folder := img.Folder
		if folder == "" {
			folder = "images"
		}

		url, err := cos.UploadBase64(img.Image, folder)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"code": 7,
				"msg":  "上传失败: " + err.Error(),
				"data": gin.H{},
			})
			return
		}
		urls = append(urls, url)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "上传成功",
		"data": UploadMultipleResp{URLs: urls},
	})
}
