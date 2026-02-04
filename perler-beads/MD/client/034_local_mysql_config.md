# 本地 XAMPP MySQL 配置

## 日期
2026-01-30

## 问题描述
后端服务器连接远程 MySQL 数据库（119.29.139.249），导致 API 请求延迟高达 60-100 秒，"我的"页面一直显示加载中。

## 解决方案

### 1. 配置本地 XAMPP MySQL

修改 `perler-beads-server/server/config.yaml`：

```yaml
# MySQL 配置 (本地 XAMPP)
mysql:
  path: "127.0.0.1"
  port: "3306"
  config: "charset=utf8mb4&parseTime=True&loc=Local"
  db-name: "perler_beads"
  username: "root"
  password: "123456"
  max-idle-conns: 10
  max-open-conns: 100
  log-mode: "info"
  log-zap: false

# Redis 配置 (本地)
redis:
  addr: "127.0.0.1:6379"
  password: ""
  db: 1
```

### 2. 创建数据库

在 phpMyAdmin 中创建 `perler_beads` 数据库。GORM 会自动迁移创建表结构。

### 3. GORM 自动迁移

后端启动时自动创建以下表：
- `projects` - 项目/方案表
- `users` - 用户表
- `user_members` - 会员表

## 测试结果

| 测试项 | 结果 |
|--------|------|
| API 健康检查 | 成功 |
| 项目列表 API | 响应时间 < 100ms |
| 数据库表创建 | 自动创建成功 |
| Profile 页面加载 | 瞬间完成 |

## 配置文件位置

| 文件 | 路径 |
|------|------|
| 后端配置 | `D:\work\web\perler-beads-server\server\config.yaml` |
| phpMyAdmin 配置 | `C:\xampp\phpMyAdmin\config.inc.php` |

## 本地开发环境要求

1. **启动 XAMPP**：
   - 启动 MySQL/MariaDB 服务
   - 启动 Redis 服务（如果需要）

2. **数据库访问**：
   - phpMyAdmin: http://localhost/phpmyadmin/
   - MySQL 用户: root
   - MySQL 密码: 123456

3. **启动后端服务**：
   ```bash
   cd D:/work/web/perler-beads-server/server
   go run .
   ```

4. **启动前端服务**：
   ```bash
   cd D:/work/web/perler-beads
   npm run dev
   ```

## 注意事项

- 本地配置仅用于开发环境
- 生产环境仍使用远程数据库
- 两者互不影响
