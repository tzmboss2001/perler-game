# 保存功能修复 - 后端服务器未启动问题

## 日期
2026-01-28

## 问题描述
用户点击"保存并开始制作"按钮时，显示"图片上传失败"错误。控制台显示 POST `/api/v1/upload/image` 返回 500 错误。

## 问题原因
后端服务器（端口 8012）没有启动，导致前端 API 请求无法到达后端。

### 架构说明
```
前端 (Vite, 端口 3005)
    ↓ /api 代理
后端 (Go + Gin, 端口 8012)
    ↓
腾讯云 COS (图片存储)
    ↓
MySQL (方案数据存储)
```

### 代理配置 (vite.config.ts)
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8012',
    changeOrigin: true,
  },
},
```

## 解决方案

### 1. 启动后端服务器
```bash
cd D:\work\web\perler-beads-server\server
go run .
```

### 2. 验证后端运行
- MySQL 连接成功
- 服务器监听端口 8012
- API 端点可用

## 测试结果
1. 上传图片 ✓
2. 裁剪图片 ✓
3. 生成拼豆图案 ✓
4. 点击"保存并开始制作" ✓
5. 图片上传到腾讯云 COS ✓
6. 方案数据保存到数据库 ✓
7. 跳转到制作页面 ✓

## 开发注意事项
**重要**: 开发和测试保存功能时，必须确保后端服务器正在运行！

启动命令：
```bash
cd D:\work\web\perler-beads-server\server && go run .
```

## 相关文件
- 前端编辑页面: `src/pages/mobile/EditorPage.tsx`
- 上传 API: `src/services/api/uploadApi.ts`
- 项目 API: `src/services/api/projectApi.ts`
- 后端代码: `D:\work\web\perler-beads-server\server`
