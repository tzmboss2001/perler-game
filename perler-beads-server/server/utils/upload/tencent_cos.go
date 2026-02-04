package upload

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/tencentyun/cos-go-sdk-v5"
	"perler-beads-server/global"
)

// TencentCOS 腾讯云COS上传
type TencentCOS struct{}

// NewTencentCOS 创建腾讯云COS上传实例
func NewTencentCOS() *TencentCOS {
	return &TencentCOS{}
}

// UploadBase64 上传Base64图片
// base64Data: base64编码的图片数据（可带data:image/xxx;base64,前缀）
// folder: 存储目录（如 "thumbnails", "originals"）
// 返回: 图片URL
func (t *TencentCOS) UploadBase64(base64Data string, folder string) (string, error) {
	// 解析base64数据
	var imageData []byte
	var ext string
	var err error

	if strings.HasPrefix(base64Data, "data:image/") {
		// 带前缀格式: data:image/png;base64,xxxxx
		parts := strings.SplitN(base64Data, ",", 2)
		if len(parts) != 2 {
			return "", fmt.Errorf("invalid base64 format")
		}

		// 提取扩展名
		mimeType := strings.TrimPrefix(parts[0], "data:")
		mimeType = strings.TrimSuffix(mimeType, ";base64")
		switch mimeType {
		case "image/png":
			ext = ".png"
		case "image/jpeg", "image/jpg":
			ext = ".jpg"
		case "image/gif":
			ext = ".gif"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".png"
		}

		imageData, err = base64.StdEncoding.DecodeString(parts[1])
	} else {
		// 纯base64数据
		ext = ".png"
		imageData, err = base64.StdEncoding.DecodeString(base64Data)
	}

	if err != nil {
		return "", fmt.Errorf("base64 decode error: %v", err)
	}

	// 生成文件名
	filename := fmt.Sprintf("%s/%d%s", folder, time.Now().UnixNano(), ext)

	// 上传到COS
	return t.upload(filename, imageData)
}

// upload 执行上传
func (t *TencentCOS) upload(filename string, data []byte) (string, error) {
	cfg := global.GVA_CONFIG.TencentCOS

	// 创建COS客户端
	u, _ := url.Parse(fmt.Sprintf("https://%s.cos.%s.myqcloud.com", cfg.Bucket, cfg.Region))
	b := &cos.BaseURL{BucketURL: u}
	client := cos.NewClient(b, &http.Client{
		Transport: &cos.AuthorizationTransport{
			SecretID:  cfg.SecretID,
			SecretKey: cfg.SecretKey,
		},
	})

	// 上传文件
	_, err := client.Object.Put(context.Background(), filename, strings.NewReader(string(data)), nil)
	if err != nil {
		return "", fmt.Errorf("upload to cos error: %v", err)
	}

	// 返回完整URL
	fileURL := fmt.Sprintf("%s/%s", cfg.BaseURL, filename)
	return fileURL, nil
}

// GetFileExt 获取base64图片的扩展名
func GetFileExt(base64Data string) string {
	if strings.HasPrefix(base64Data, "data:image/png") {
		return ".png"
	} else if strings.HasPrefix(base64Data, "data:image/jpeg") || strings.HasPrefix(base64Data, "data:image/jpg") {
		return ".jpg"
	} else if strings.HasPrefix(base64Data, "data:image/gif") {
		return ".gif"
	} else if strings.HasPrefix(base64Data, "data:image/webp") {
		return ".webp"
	}
	return ".png"
}

// GenerateFilename 生成唯一文件名
func GenerateFilename(folder, ext string) string {
	return filepath.Join(folder, fmt.Sprintf("%d%s", time.Now().UnixNano(), ext))
}
