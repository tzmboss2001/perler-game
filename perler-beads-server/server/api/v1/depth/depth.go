package depth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"perler-beads-server/global"
)

// DepthApi 深度估计接口
type DepthApi struct{}

// EstimateDepthReq 深度估计请求
type EstimateDepthReq struct {
	Image string `json:"image" binding:"required"` // Base64图片数据或图片URL
}

// EstimateDepthResp 深度估计响应
type EstimateDepthResp struct {
	DepthURL      string  `json:"depth_url"`       // 灰度深度图URL
	ColorDepthURL string  `json:"color_depth_url"` // 彩色深度图URL（可选）
	PredictTime   float64 `json:"predict_time"`    // 预测耗时（秒）
}

// ReplicatePrediction Replicate API 预测响应
type ReplicatePrediction struct {
	ID          string                 `json:"id"`
	Status      string                 `json:"status"`
	Output      interface{}            `json:"output"`
	Error       string                 `json:"error"`
	Metrics     map[string]interface{} `json:"metrics"`
	CompletedAt string                 `json:"completed_at"`
}

// EstimateDepth 深度估计
// @Summary 深度估计
// @Description 使用 Marigold AI 模型估计图片深度
// @Tags 深度估计
// @Accept json
// @Produce json
// @Param data body EstimateDepthReq true "图片数据"
// @Success 200 {object} map[string]interface{} "返回深度图URL"
// @Router /depth/estimate [post]
func (d *DepthApi) EstimateDepth(c *gin.Context) {
	var req EstimateDepthReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 7,
			"msg":  "参数错误: " + err.Error(),
			"data": gin.H{},
		})
		return
	}

	// 获取配置
	apiToken := global.GVA_CONFIG.Replicate.APIToken
	modelVersion := global.GVA_CONFIG.Replicate.MarigoldVersion

	if apiToken == "" {
		c.JSON(http.StatusOK, gin.H{
			"code": 7,
			"msg":  "Replicate API Token 未配置",
			"data": gin.H{},
		})
		return
	}

	// 创建预测任务
	prediction, err := createPrediction(apiToken, modelVersion, req.Image)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 7,
			"msg":  "创建预测任务失败: " + err.Error(),
			"data": gin.H{},
		})
		return
	}

	// 轮询等待结果
	result, err := waitForPrediction(apiToken, prediction.ID, 120*time.Second)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 7,
			"msg":  "深度估计失败: " + err.Error(),
			"data": gin.H{},
		})
		return
	}

	// 解析输出
	resp := parseOutput(result)

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"msg":  "深度估计成功",
		"data": resp,
	})
}

// createPrediction 创建 Replicate 预测任务
// modelVersion 支持两种格式：
// - "owner/model" (如 "adirik/marigold") - 使用新的模型API
// - 64位hex hash - 使用旧的版本API
func createPrediction(apiToken, modelVersion, image string) (*ReplicatePrediction, error) {
	var apiURL string
	var payload map[string]interface{}

	// 判断是模型名称还是版本hash
	if len(modelVersion) == 64 {
		// 旧方式：使用版本hash
		apiURL = "https://api.replicate.com/v1/predictions"
		payload = map[string]interface{}{
			"version": modelVersion,
			"input": map[string]interface{}{
				"image": image,
			},
		}
	} else {
		// 新方式：使用模型名称 (owner/model)
		apiURL = fmt.Sprintf("https://api.replicate.com/v1/models/%s/predictions", modelVersion)
		payload = map[string]interface{}{
			"input": map[string]interface{}{
				"image": image,
			},
		}
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("序列化请求失败: %w", err)
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "wait=60")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("发送请求失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		return nil, fmt.Errorf("API返回错误: %d - %s", resp.StatusCode, string(body))
	}

	var prediction ReplicatePrediction
	if err := json.Unmarshal(body, &prediction); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	return &prediction, nil
}

// waitForPrediction 等待预测完成
func waitForPrediction(apiToken, predictionID string, timeout time.Duration) (*ReplicatePrediction, error) {
	url := fmt.Sprintf("https://api.replicate.com/v1/predictions/%s", predictionID)
	deadline := time.Now().Add(timeout)

	for time.Now().Before(deadline) {
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("创建请求失败: %w", err)
		}

		req.Header.Set("Authorization", "Bearer "+apiToken)

		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			time.Sleep(1 * time.Second)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			time.Sleep(1 * time.Second)
			continue
		}

		var prediction ReplicatePrediction
		if err := json.Unmarshal(body, &prediction); err != nil {
			return nil, fmt.Errorf("解析响应失败: %w", err)
		}

		switch prediction.Status {
		case "succeeded":
			return &prediction, nil
		case "failed":
			return nil, fmt.Errorf("预测失败: %s", prediction.Error)
		case "canceled":
			return nil, fmt.Errorf("预测被取消")
		}

		// 继续等待
		time.Sleep(1 * time.Second)
	}

	return nil, fmt.Errorf("预测超时")
}

// parseOutput 解析输出
func parseOutput(prediction *ReplicatePrediction) EstimateDepthResp {
	resp := EstimateDepthResp{}

	// 获取预测耗时
	if metrics := prediction.Metrics; metrics != nil {
		if predictTime, ok := metrics["predict_time"].(float64); ok {
			resp.PredictTime = predictTime
		}
	}

	// 解析输出 - Marigold 模型输出是一个包含多个URL的数组或对象
	switch output := prediction.Output.(type) {
	case string:
		// 单个URL
		resp.DepthURL = output
	case []interface{}:
		// URL数组
		for i, item := range output {
			if url, ok := item.(string); ok {
				if i == 0 {
					resp.DepthURL = url // 第一个是灰度深度图
				} else if i == 1 {
					resp.ColorDepthURL = url // 第二个是彩色深度图
				}
			}
		}
	case map[string]interface{}:
		// 对象格式
		if depth, ok := output["depth"].(string); ok {
			resp.DepthURL = depth
		}
		if colorDepth, ok := output["depth_colored"].(string); ok {
			resp.ColorDepthURL = colorDepth
		}
	}

	return resp
}
