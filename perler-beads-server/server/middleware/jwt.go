package middleware

import (
    "errors"
    "strings"

    "perler-beads-server/global"
    "perler-beads-server/model/response"
    "perler-beads-server/utils"

    "github.com/gin-gonic/gin"
)

// JWTAuth JWT 认证中间件
func JWTAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 从 Header 获取 Token，支持 Authorization 和 x-token 两种方式
        token := c.Request.Header.Get("Authorization")
        if token == "" {
            token = c.Request.Header.Get("x-token")
        }
        if token == "" {
            response.FailWithMessage("未登录或登录状态已失效，请先登录", c)
            c.Abort()
            return
        }

        // 去除 Bearer 前缀
        if strings.HasPrefix(token, "Bearer ") {
            token = token[7:]
        }

        // 解析 Token
        j := utils.NewJWT()
        claims, err := j.ParseToken(token)
        if err != nil {
            if errors.Is(err, utils.TokenExpired) {
                response.FailWithMessage("登录状态已过期，请重新登录", c)
                c.Abort()
                return
            }
            global.GVA_LOG.Error("Token parse error: " + err.Error())
            response.FailWithMessage("登录凭证无效，请重新登录", c)
            c.Abort()
            return
        }

        // 将用户信息存入上下文
        c.Set("claims", claims)
        c.Set("userID", claims.UserID)
        c.Next()
    }
}
