# 邮箱注册登录功能实现

**日期**: 2026-01-25
**类型**: 新功能
**状态**: 已完成

## 功能描述

实现邮箱注册登录功能，为后期切换到抖音号登录做准备。

### 核心功能
1. 用户邮箱注册
2. 用户邮箱登录
3. JWT Token 认证
4. 用户信息获取
5. 修改密码
6. 登出功能

## 修改的文件

### 后端 (perler-beads-server)

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/model/entity/user.go` | 新建 | User 和 UserMember 数据模型 |
| `server/model/request/auth_req.go` | 新建 | 认证请求 DTO（注册、登录、修改密码等） |
| `server/model/response/auth_resp.go` | 新建 | 认证响应 DTO（登录响应、用户信息） |
| `server/service/auth.go` | 新建 | 认证服务层（注册、登录、获取用户信息、修改密码） |
| `server/api/v1/auth/auth.go` | 修改 | 添加邮箱注册/登录 API 实现 |
| `server/router/auth.go` | 修改 | 添加认证路由（公开+私有） |
| `server/initialize/router.go` | 修改 | 注册认证私有路由 |
| `server/initialize/gorm.go` | 修改 | 添加 User、UserMember 表自动迁移 |

### 前端 (perler-beads)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/services/api/authApi.ts` | 新建 | 认证 API 服务（登录、注册、登出等） |
| `src/store/userStore.ts` | 新建 | 用户状态管理 store（Zustand） |
| `src/pages/mobile/LoginPage.tsx` | 新建 | 登录/注册页面组件 |
| `src/pages/mobile/ProfilePage.tsx` | 修改 | 添加登录状态显示和登录/登出按钮 |
| `src/router/index.tsx` | 修改 | 添加登录页面路由 |

## API 端点

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/v1/auth/register` | POST | 用户注册 | 否 |
| `/api/v1/auth/login` | POST | 用户登录 | 否 |
| `/api/v1/auth/user-info` | GET | 获取用户信息 | 是 |
| `/api/v1/auth/change-password` | POST | 修改密码 | 是 |

## 数据结构

### User 模型
```go
type User struct {
    ID            uint       `json:"id"`
    Email         string     `json:"email"`        // 邮箱（唯一）
    Username      string     `json:"username"`     // 用户名
    PasswordHash  string     `json:"-"`            // 密码哈希
    Nickname      string     `json:"nickname"`     // 昵称
    Avatar        string     `json:"avatar"`       // 头像URL
    Phone         string     `json:"phone"`        // 手机号
    Status        int        `json:"status"`       // 账户状态
    EmailVerified bool       `json:"email_verified"` // 邮箱验证
    LastLoginAt   *time.Time `json:"last_login_at"`  // 最后登录时间
    LastLoginIP   string     `json:"last_login_ip"`  // 最后登录IP
}
```

### UserMember 模型
```go
type UserMember struct {
    ID        uint       `json:"id"`
    UserID    uint       `json:"user_id"`   // 用户ID
    Level     int        `json:"level"`     // 会员等级
    ExpireAt  *time.Time `json:"expire_at"` // 会员过期时间
}
```

## 技术要点

1. **密码加密**：使用 bcrypt 进行密码哈希
2. **JWT 认证**：Token 有效期 7 天
3. **本地存储**：Token 和用户信息存储在 localStorage
4. **状态管理**：使用 Zustand 管理用户登录状态
5. **游客模式**：支持不登录继续使用（使用 DeviceID）

## 用户流程

```
ProfilePage → 点击"登录"按钮 → LoginPage
                                    ↓
                            输入邮箱/密码
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
               登录成功                          注册成功
                    ↓                               ↓
              保存Token                        自动登录
                    ↓                               ↓
              跳转回ProfilePage ←───────────────────┘
                    ↓
            显示用户信息和"退出"按钮
```

## 验证步骤

### 后端验证
1. 启动后端：`cd server && go run .`
2. 检查数据库表是否创建：`users`、`user_members` 表

### 前端验证
1. 启动前端：`npm run dev`
2. 进入"我的"页面，点击"登录"按钮
3. 测试注册功能
4. 测试登录功能
5. 查看用户信息显示
6. 测试退出登录功能

## 编译验证

- ✅ 后端 Go 编译通过
- ✅ 前端 Vite 构建通过

## 后续计划

1. 添加邮箱验证功能
2. 添加忘记密码功能
3. 切换为抖音号登录
