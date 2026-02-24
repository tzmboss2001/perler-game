# Phase 3 - 后端脚手架 + 完整API

## 日期: 2026-02-09

## 变更内容

### 新建 server/ 后端目录 (~30个文件)

#### 架构
- Go + Gin + GORM 简洁三层架构
- JWT + bcrypt 认证
- MySQL 数据库 (perler_game)
- 端口: 8013

#### 目录结构
```
server/
├── main.go, go.mod, config.yaml
├── config/config.go           # 配置结构体
├── global/global.go           # 全局变量(DB,Config,Log)
├── initialize/                # viper.go, zap.go, gorm.go, redis.go, router.go
├── middleware/                 # cors.go, jwt.go, optional_auth.go
├── model/entity/              # user.go, work.go, like.go, comment.go
├── model/request/             # auth_req.go, work_req.go, gallery_req.go
├── model/response/            # response.go, auth_resp.go, work_resp.go, gallery_resp.go
├── utils/jwt.go               # JWT 生成解析
├── service/                   # auth.go, work.go, gallery.go
├── api/v1/                    # auth/, work/, gallery/
└── router/                    # auth.go, work.go, gallery.go
```

#### 数据库表 (4张)
- `users`: id, email(unique), password_hash, nickname, avatar, status, last_login_at, last_login_ip
- `works`: id, user_id, device_id, title, board_json, thumbnail, template_id, bead_count, board_width, board_height, ironing_score, failure_type, risk_score, is_public, view_count, like_count, comment_count
- `likes`: id, user_id, work_id (unique: user_id+work_id)
- `comments`: id, user_id, work_id, content(500字)

#### API 端点 (15个)
| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/v1/auth/smart-login | 公开 | 智能登录 |
| GET | /api/v1/auth/user-info | JWT | 获取用户信息 |
| POST | /api/v1/auth/change-password | JWT | 修改密码 |
| POST | /api/v1/work/save | JWT | 保存作品 |
| GET | /api/v1/work/list | JWT | 我的作品列表 |
| GET | /api/v1/work/:id | JWT | 作品详情 |
| DELETE | /api/v1/work/:id | JWT | 删除作品 |
| POST | /api/v1/work/:id/publish | JWT | 发布到广场 |
| GET | /api/v1/gallery/list | 公开 | 广场列表 |
| GET | /api/v1/gallery/:id | 可选 | 作品详情 |
| POST | /api/v1/gallery/:id/like | JWT | 点赞/取消 |
| GET | /api/v1/gallery/:id/comments | 公开 | 评论列表 |
| POST | /api/v1/gallery/:id/comment | JWT | 发表评论 |
| GET | /api/v1/gallery/leaderboard | 公开 | 翻车排行榜 |
| GET | /health | 公开 | 健康检查 |

### 复用来源
- 从 perler-beads-server 复用: global.go, initialize/*.go, middleware/*.go, utils/jwt.go, model/response/response.go, service/auth.go

## 验证
- `go build .` 编译通过
- `go run .` 启动成功，AutoMigrate 创建4张表
- curl 测试全部15个API端点通过
