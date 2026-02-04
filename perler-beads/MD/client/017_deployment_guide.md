# 拼豆工坊 - 部署指南

## 日期
2026-01-25

## 部署状态

### 已完成
| 项目 | 状态 | 说明 |
|------|------|------|
| 前端构建 | ✅ | `npm run build` 成功 |
| 前端上传 | ✅ | 已上传到 `/www/wwwroot/perler-beads` |
| Nginx 配置 | ✅ | 监听端口 3005 |

### 待完成
| 项目 | 说明 |
|------|------|
| 腾讯云安全组 | 需要开放端口 3005 |
| 后端部署 | 需要启动 Go 后端服务 |

## 访问地址
- 前端: http://119.29.139.249:3005
- 后端API: http://119.29.139.249:8012

## 腾讯云安全组配置

### 步骤
1. 登录腾讯云控制台: https://console.cloud.tencent.com/
2. 进入: 云服务器 → 安全组
3. 找到对应的安全组，点击"修改规则"
4. 添加入站规则:
   - 类型: 自定义
   - 来源: 0.0.0.0/0
   - 协议端口: TCP:3005
   - 策略: 允许
5. 保存规则

## Nginx 配置
位置: `/www/server/panel/vhost/nginx/perler-beads.conf`

```nginx
server {
    listen 3005;
    server_name _;
    root /www/wwwroot/perler-beads;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
    }

    location /api {
        proxy_pass http://127.0.0.1:8012;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

## 后端部署

### 后端项目位置
`D:\work\web\perler-beads-server\server`

### 后端启动命令
```bash
cd /www/wwwroot/perler-beads-server
./server  # 或 go run .
```

### 后端需要的配置
- MySQL 数据库
- Redis 缓存
- 腾讯云 COS 配置

## 重新部署

### 前端重新部署
```bash
# 本地构建
cd D:\work\web\perler-beads
npm run build

# 执行部署脚本
python SCRIPT/deploy.py
```

### 重载 Nginx
```bash
/www/server/nginx/sbin/nginx -s reload
```

## 文件结构
```
服务器目录: /www/wwwroot/perler-beads/
├── index.html
└── assets/
    ├── index-*.js
    ├── HomePage-*.js
    ├── EditorPage-*.js
    ├── MakingPage-*.js
    └── ...
```
