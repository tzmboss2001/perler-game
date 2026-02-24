package middleware

import (
	"perler-game-server/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// OptionalAuth 可选认证中间件 - 有 token 解析用户，无 token 跳过
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Request.Header.Get("Authorization")
		if token == "" {
			token = c.Request.Header.Get("x-token")
		}

		if token == "" {
			c.Next()
			return
		}

		if strings.HasPrefix(token, "Bearer ") {
			token = token[7:]
		}

		j := utils.NewJWT()
		claims, err := j.ParseToken(token)
		if err == nil {
			c.Set("claims", claims)
			c.Set("userID", claims.UserID)
		}

		c.Next()
	}
}
