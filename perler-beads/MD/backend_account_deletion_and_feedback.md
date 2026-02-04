# 后端实现：账号注销和意见反馈

## 日期
2026-02-02

## 实现内容

### 1. 账号注销 API

**接口**: `DELETE /api/v1/auth/delete-account`

**需要登录**: 是（JWT Token）

**功能**:
- 使用事务删除用户所有数据
- 删除顺序：方案 → 会员信息 → 用户信息
- 任一步骤失败则回滚

**涉及文件**:
- `server/service/auth.go` - 新增 `DeleteAccount` 方法
- `server/api/v1/auth/auth.go` - 新增 API 处理函数
- `server/router/auth.go` - 新增路由

### 2. 意见反馈 API

**接口**: `POST /api/v1/feedback/create`

**需要登录**: 否（但会记录登录用户ID）

**请求参数**:
```json
{
  "type": "bug|suggestion|other",  // 反馈类型
  "content": "反馈内容（10-500字）",
  "contact": "联系方式（选填）"
}
```

**涉及文件**:
- `server/model/entity/feedback.go` - 反馈数据模型
- `server/model/request/feedback_req.go` - 请求 DTO
- `server/service/feedback.go` - 反馈服务
- `server/api/v1/feedback/feedback.go` - API 处理
- `server/router/feedback.go` - 路由配置
- `server/initialize/router.go` - 注册路由
- `server/initialize/gorm.go` - 数据库迁移

### 3. 数据库表

**feedbacks 表结构**:
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uint | 主键 |
| user_id | uint | 用户ID（可为空） |
| type | varchar(20) | 反馈类型 |
| content | text | 反馈内容 |
| contact | varchar(100) | 联系方式 |
| status | int | 状态：0待处理/1已处理/2已关闭 |
| reply | text | 回复内容 |
| replied_at | datetime | 回复时间 |
| ip | varchar(45) | 提交IP |
| user_agent | varchar(500) | 用户代理 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

## 部署步骤

1. 重新编译后端代码
```bash
cd perler-beads-server/server
go mod tidy
go build -o perler-beads-server
```

2. 重启服务（表会自动迁移）

3. 验证接口
```bash
# 测试反馈接口
curl -X POST http://localhost:8012/api/v1/feedback/create \
  -H "Content-Type: application/json" \
  -d '{"type":"suggestion","content":"这是一个测试反馈内容"}'

# 测试注销接口（需要登录token）
curl -X DELETE http://localhost:8012/api/v1/auth/delete-account \
  -H "x-token: YOUR_TOKEN"
```

## 注意事项

1. 账号注销是不可逆操作，删除后数据无法恢复
2. 反馈接口无需登录，但建议前端在登录状态下提交以便追踪
3. 反馈表预留了回复功能，后续可开发管理后台进行处理
