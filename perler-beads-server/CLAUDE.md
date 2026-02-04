# CLAUDE.md - 拼豆工坊后端

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**拼豆工坊后端** - 基于 Go + Gin 的 API 服务，为拼豆图案生成器提供后端支持。

## 常用命令

```bash
# 进入后端目录
cd server

# 安装依赖
go mod tidy

# 运行服务 (端口 8012)
go run .

# 生成 Swagger 文档
swag init
```

## 固定端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| **perler-beads-server API** | 8012 | Go 后端 API |
| **perler-beads-server 管理后台** | 8083 | Vue 管理后台（待开发） |

## 架构概述

### 分层架构

```
请求 → Router → API → Service → Model → Database
```

- **Router层**: 定义路由规则，配置中间件
- **API层**: 参数校验，调用Service，返回JSON响应
- **Service层**: 核心业务逻辑，数据库CRUD
- **Model层**: GORM结构体，请求/响应DTO

### 目录结构

```
perler-beads-server/
├── server/                  # Go 后端
│   ├── api/v1/              # API 控制器
│   │   ├── auth/            # 认证模块
│   │   ├── user/            # 用户模块
│   │   ├── project/         # 作品模块
│   │   ├── template/        # 模板模块
│   │   ├── community/       # 社区模块
│   │   ├── payment/         # 支付模块
│   │   └── bead/            # 珠子数据模块
│   ├── model/               # 数据模型
│   │   ├── request/         # 请求 DTO
│   │   └── response/        # 响应 DTO
│   ├── service/             # 业务逻辑
│   ├── router/              # 路由定义
│   ├── middleware/          # 中间件
│   ├── config/              # 配置结构
│   ├── global/              # 全局变量
│   ├── initialize/          # 初始化模块
│   ├── utils/               # 工具函数
│   ├── config.yaml          # 配置文件
│   ├── go.mod               # Go 模块
│   └── main.go              # 入口文件
└── admin/                   # 管理后台（待开发）
```

## API 接口

### 公开接口（无需登录）
- `POST /api/v1/auth/wechat-login` - 微信登录
- `POST /api/v1/auth/phone-login` - 手机号登录
- `GET /api/v1/bead/brands` - 获取珠子品牌
- `GET /api/v1/bead/colors/:brand` - 获取颜色列表
- `GET /api/v1/template/list` - 模板列表
- `GET /api/v1/community/posts` - 社区作品列表

### 私有接口（需要登录）
- `GET /api/v1/user/profile` - 获取用户信息
- `POST /api/v1/project/create` - 创建作品
- `GET /api/v1/project/list` - 作品列表
- `POST /api/v1/payment/create-order` - 创建订单

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Go | 1.22+ | 后端语言 |
| Gin | 1.10 | Web 框架 |
| GORM | 1.25 | ORM |
| MySQL | 5.7+ | 数据库 |
| Redis | 6+ | 缓存 |
| JWT | v5 | 认证 |

## 数据库配置

使用现有服务器的 MySQL：
- Host: 127.0.0.1
- Port: 3306
- Database: perler_beads
- Username: root
- Password: RmFRQ3PtckP8XRzA

## 开发要求

### 基本规范
1. 请用中文回答所有内容
2. 回答前加上模型说明
3. 每次改完BUG，添加MD文件到 `../perler-beads/MD/` 目录

### API Swagger 注释（必须）
```go
// CreateXxx 创建XXX
// @Tags     XxxModule
// @Summary  创建一个新的XXX
// @Security ApiKeyAuth
// @accept   application/json
// @Produce  application/json
// @Param    data body request.CreateXxxRequest true "参数描述"
// @Success  200 {object} response.Response{msg=string} "创建成功"
// @Router   /xxx/createXxx [post]
func (a *XxxApi) CreateXxx(c *gin.Context) {}
```

### 统一响应格式
```go
// 成功响应
response.OkWithData(data, c)
response.OkWithMessage("操作成功", c)

// 失败响应
response.FailWithMessage("错误信息", c)
```

## 服务器部署

与前端项目共用服务器：
- IP: 119.29.139.249
- 宝塔面板: https://119.29.139.249:42720/a117484c
