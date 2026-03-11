package ai

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"image"
	"image/color"
	"image/draw"
	"image/jpeg"
	"image/png"
	"os"
	"strings"
	"sync"

	"perler-beads-server/model/response"

	"github.com/gin-gonic/gin"
)

type AiApi struct{}

type CutoutReq struct {
	ImageData string `json:"imageData" binding:"required"`
	Mode      string `json:"mode"`
}

type CutoutResp struct {
	ImageData string `json:"imageData"`
	Provider  string `json:"provider"`
}

var aiCutoutCache sync.Map

func (a *AiApi) Cutout(c *gin.Context) {
	var req CutoutReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.FailWithMessage("参数错误: "+err.Error(), c)
		return
	}

	enabledMode := strings.ToLower(strings.TrimSpace(os.Getenv("AI_CUTOUT_MODE")))
	if enabledMode == "" {
		enabledMode = "mock"
	}

	if enabledMode == "off" {
		response.FailWithMessage("智能抠图服务暂未启用", c)
		return
	}

	cacheKey := buildCutoutCacheKey(req.Mode, req.ImageData)
	if cached, ok := readCutoutCache(cacheKey); ok {
		c.Header("X-AI-Cutout-Cache", "HIT")
		response.OkWithDetailed(cached, "智能抠图处理成功", c)
		return
	}

	var (
		resultImage string
		err         error
	)

	switch enabledMode {
	case "mock":
		resultImage, err = buildMockCutoutDataURL(req.ImageData)
	case "live":
		err = errors.New("服务端真实 AI 供应商尚未配置")
	default:
		err = errors.New("不支持的智能抠图模式")
	}

	if err != nil {
		response.FailWithMessage("智能抠图处理失败: "+err.Error(), c)
		return
	}

	resp := CutoutResp{
		ImageData: resultImage,
		Provider:  "aliyun",
	}
	writeCutoutCache(cacheKey, resp)
	c.Header("X-AI-Cutout-Cache", "MISS")
	response.OkWithDetailed(resp, "智能抠图处理成功", c)
}

func buildCutoutCacheKey(mode string, imageData string) string {
	sum := sha256.Sum256([]byte(mode + ":" + imageData))
	return hex.EncodeToString(sum[:])
}

func readCutoutCache(cacheKey string) (CutoutResp, bool) {
	value, ok := aiCutoutCache.Load(cacheKey)
	if !ok {
		return CutoutResp{}, false
	}
	cached, ok := value.(CutoutResp)
	return cached, ok
}

func writeCutoutCache(cacheKey string, resp CutoutResp) {
	aiCutoutCache.Store(cacheKey, resp)
}

func buildMockCutoutDataURL(imageData string) (string, error) {
	_, rawBytes, err := decodeDataURL(imageData)
	if err != nil {
		return "", err
	}

	img, _, err := image.Decode(bytes.NewReader(rawBytes))
	if err != nil {
		return "", err
	}

	bounds := img.Bounds()
	rgba := image.NewNRGBA(bounds)
	draw.Draw(rgba, bounds, img, bounds.Min, draw.Src)

	avgColor, ok := averageBorderColor(rgba)
	if !ok {
		return imageData, nil
	}

	applyTransparentBorderFloodFill(rgba, avgColor, 48)

	var output bytes.Buffer
	if err := png.Encode(&output, rgba); err != nil {
		return "", err
	}

	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(output.Bytes()), nil
}

func decodeDataURL(dataURL string) (string, []byte, error) {
	if !strings.HasPrefix(dataURL, "data:") {
		return "", nil, errors.New("仅支持 data URL 图片")
	}

	parts := strings.SplitN(dataURL, ",", 2)
	if len(parts) != 2 {
		return "", nil, errors.New("图片数据格式无效")
	}

	meta := parts[0]
	rawBase64 := parts[1]

	if !strings.Contains(meta, ";base64") {
		return "", nil, errors.New("仅支持 base64 图片数据")
	}

	mimeType := strings.TrimPrefix(strings.Split(meta, ";")[0], "data:")
	decoded, err := base64.StdEncoding.DecodeString(rawBase64)
	if err != nil {
		return "", nil, err
	}

	if mimeType == "image/jpeg" || mimeType == "image/jpg" {
		if _, err := jpeg.Decode(bytes.NewReader(decoded)); err != nil {
			return "", nil, err
		}
	}

	return mimeType, decoded, nil
}

func averageBorderColor(img *image.NRGBA) (color.NRGBA, bool) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width == 0 || height == 0 {
		return color.NRGBA{}, false
	}

	var sumR, sumG, sumB, count uint64
	sample := func(x, y int) {
		pixel := img.NRGBAAt(x, y)
		if pixel.A < 16 {
			return
		}
		sumR += uint64(pixel.R)
		sumG += uint64(pixel.G)
		sumB += uint64(pixel.B)
		count++
	}

	for x := 0; x < width; x++ {
		sample(x, 0)
		sample(x, height-1)
	}
	for y := 1; y < height-1; y++ {
		sample(0, y)
		sample(width-1, y)
	}

	if count == 0 {
		return color.NRGBA{}, false
	}

	return color.NRGBA{
		R: uint8(sumR / count),
		G: uint8(sumG / count),
		B: uint8(sumB / count),
		A: 255,
	}, true
}

func applyTransparentBorderFloodFill(img *image.NRGBA, target color.NRGBA, threshold float64) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width == 0 || height == 0 {
		return
	}

	type point struct{ x, y int }
	queue := make([]point, 0, width*2+height*2)
	visited := make([]bool, width*height)
	push := func(x, y int) {
		index := y*width + x
		if visited[index] {
			return
		}
		visited[index] = true
		queue = append(queue, point{x: x, y: y})
	}

	for x := 0; x < width; x++ {
		push(x, 0)
		push(x, height-1)
	}
	for y := 1; y < height-1; y++ {
		push(0, y)
		push(width-1, y)
	}

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		pixel := img.NRGBAAt(current.x, current.y)
		if pixel.A >= 16 && colorDistance(pixel, target) > threshold {
			continue
		}

		pixel.A = 0
		img.SetNRGBA(current.x, current.y, pixel)

		if current.x > 0 {
			push(current.x-1, current.y)
		}
		if current.x < width-1 {
			push(current.x+1, current.y)
		}
		if current.y > 0 {
			push(current.x, current.y-1)
		}
		if current.y < height-1 {
			push(current.x, current.y+1)
		}
	}
}

func colorDistance(a color.NRGBA, b color.NRGBA) float64 {
	dr := float64(int(a.R) - int(b.R))
	dg := float64(int(a.G) - int(b.G))
	db := float64(int(a.B) - int(b.B))
	return sqrt(dr*dr + dg*dg + db*db)
}

func sqrt(value float64) float64 {
	z := value
	if z == 0 {
		return 0
	}
	x := value/2 + 1
	for i := 0; i < 8; i++ {
		x = (x + z/x) / 2
	}
	return x
}
