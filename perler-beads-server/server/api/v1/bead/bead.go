package bead

import (
	"perler-beads-server/model/response"

	"github.com/gin-gonic/gin"
)

type BeadApi struct{}

// GetBrands 获取珠子品牌列表
func (b *BeadApi) GetBrands(c *gin.Context) {
	// 当前阶段返回内置品牌数据，后续可切换为数据库配置。
	brands := []map[string]interface{}{
		{"id": 1, "name": "perler", "nameCN": "Perler", "country": "美国"},
		{"id": 2, "name": "hama", "nameCN": "Hama", "country": "丹麦"},
		{"id": 3, "name": "artkal", "nameCN": "Artkal", "country": "中国"},
	}
	response.OkWithData(brands, c)
}

// GetColors 获取珠子颜色列表
func (b *BeadApi) GetColors(c *gin.Context) {
	brand := c.Param("brand")

	// 当前阶段返回内置颜色数据，后续可切换为数据库配置。
	colors := []map[string]interface{}{
		{"id": "P01", "name": "White", "nameCN": "白色", "rgb": []int{255, 255, 255}},
		{"id": "P02", "name": "Black", "nameCN": "黑色", "rgb": []int{0, 0, 0}},
		{"id": "P03", "name": "Red", "nameCN": "红色", "rgb": []int{255, 0, 0}},
	}

	response.OkWithDetailed(map[string]interface{}{
		"brand":  brand,
		"colors": colors,
	}, "获取颜色列表成功", c)
}
