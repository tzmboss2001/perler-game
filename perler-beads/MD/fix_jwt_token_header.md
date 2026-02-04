# 修复：JWT Token Header 不匹配问题

## 日期
2026-02-02

## 问题描述
用户登录后保存的方案无法在"我的方案"列表中显示，显示为空(0个方案)。

## 问题原因
1. **后端 JWT 中间件** 只检查 `Authorization` header
2. **前端 projectApi** 发送的是 `x-token` header
3. 导致后端无法识别已登录用户，保存方案时返回"未登录或非法访问"

## 修复内容

### 1. 后端 middleware/jwt.go
```go
// 修改前：只检查 Authorization
token := c.Request.Header.Get("Authorization")

// 修改后：同时支持 Authorization 和 x-token
token := c.Request.Header.Get("Authorization")
if token == "" {
    token = c.Request.Header.Get("x-token")
}
```

### 2. 前端 services/api/projectApi.ts
```typescript
// 添加 import
import { getToken } from './authApi';

// 在 request 函数中添加 token header
const token = getToken();
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(options.headers as Record<string, string>),
};
if (token) {
  headers['x-token'] = token;
}
```

### 3. 后端 api/v1/project/project.go
```go
// 修改 getUserID 函数，支持从 header 手动解析 JWT（公开路由）
func getUserID(c *gin.Context) uint {
    // 首先尝试从上下文获取（JWT中间件已解析）
    if userID, exists := c.Get("userID"); exists {
        if id, ok := userID.(uint); ok && id > 0 {
            return id
        }
    }

    // 如果上下文没有（公开路由），尝试从 header 手动解析 JWT
    token := c.Request.Header.Get("x-token")
    if token == "" {
        return 0
    }

    j := utils.NewJWT()
    claims, err := j.ParseToken(token)
    if err != nil {
        return 0
    }

    return claims.UserID
}
```

## 测试结果
完整流程测试通过：
1. ✅ 用户登录
2. ✅ 创建并保存方案
3. ✅ 方案列表正确显示
4. ✅ 从列表进入制作模式

## 涉及文件
- `perler-beads-server/server/middleware/jwt.go`
- `perler-beads-server/server/api/v1/project/project.go`
- `perler-beads/src/services/api/projectApi.ts`
