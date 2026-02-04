package bead

import (
	"perler-beads-server/model/response"

	"github.com/gin-gonic/gin"
)

type BeadApi struct{}

// GetBrands 获取珠子品牌列表
// @Tags     Bead
// @Summary  获取珠子品牌列表
// @Produce  application/json
// @Success  200 {object} response.Response{data=[]object} "获取成功"
// @Router   /bead/brands [get]
func (b *BeadApi) GetBrands(c *gin.Context) {
	// TODO: 实现获取品牌列表逻辑
	// 临时返回静态数据
	brands := []map[string]interface{}{
		{"id": 1, "name": "perler", "nameCN": "Perler", "country": "美国"},
		{"id": 2, "name": "hama", "nameCN": "Hama", "country": "丹麦"},
		{"id": 3, "name": "artkal", "nameCN": "Artkal", "country": "中国"},
	}
	response.OkWithData(brands, c)
}

// GetColors 获取珠子颜色列表
// @Tags     Bead
// @Summary  获取珠子颜色列表
// @Produce  application/json
// @Param    brand path string true "品牌名称"
// @Success  200 {object} response.Response{data=[]object} "获取成功"
// @Router   /bead/colors/{brand} [get]
func (b *BeadApi) GetColors(c *gin.Context) {
	brand := c.Param("brand")

	// TODO: 实现从数据库获取颜色列表
	// 临时返回示例数据
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
