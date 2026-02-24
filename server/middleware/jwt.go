package middleware

import (
	"errors"
	"perler-game-server/global"
	"perler-game-server/model/response"
	"perler-game-server/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// JWTAuth JWT 认证中间件
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Request.Header.Get("Authorization")
		if token == "" {
			token = c.Request.Header.Get("x-token")
		}
		if token == "" {
			response.FailWithMessage("未登录或非法访问", c)
			c.Abort()
			return
		}

		if strings.HasPrefix(token, "Bearer ") {
			token = token[7:]
		}

		j := utils.NewJWT()
		claims, err := j.ParseToken(token)
		if err != nil {
			if errors.Is(err, utils.TokenExpired) {
				response.FailWithMessage("授权已过期", c)
				c.Abort()
				return
			}
			global.GVA_LOG.Error("Token parse error: " + err.Error())
			response.FailWithMessage("无效的Token", c)
			c.Abort()
			return
		}

		c.Set("claims", claims)
		c.Set("userID", claims.UserID)
		c.Next()
	}
}
