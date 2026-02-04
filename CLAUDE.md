# CLAUDE.md - 拼豆工坊项目

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 工作区概述

此目录包含拼豆工坊的前后端项目：

| 项目 | 路径 | 技术栈 | 用途 |
|------|------|--------|------|
| **perler-beads** | `./perler-beads/` | React 19 + TypeScript + Vite | **用户端 - 移动端H5前端**（拼豆图案生成器） |
| **perler-beads-server** | `./perler-beads-server/` | Go + Gin | **后端API服务** |

**重要**: 每个项目有独立的 `CLAUDE.md`，进入子项目工作时请先阅读对应的文档。

## 架构关系

```
┌─────────────────────────────────────────────────────────────────┐
│                D:\work\web\perler-beads-creator                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  perler-beads/ (端口 3005)                               │   │
│  │  ═══════════════════════════════════════════════════════│   │
│  │  用户端 - 移动端H5前端                                   │   │
│  │  React + TypeScript                                      │   │
│  │  给普通用户使用的拼豆图案生成界面                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ 调用API                          │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  perler-beads-server/ (端口 8012)                        │   │
│  │  ═══════════════════════════════════════════════════════│   │
│  │  Go 后端 API 服务                                        │   │
│  │  处理业务逻辑、数据库操作、用户认证                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 固定端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| **perler-beads 前端** | 3005 | React 拼豆工坊 |
| **perler-beads-server API** | 8012 | Go 后端 API |

## 常用命令速查

### perler-beads (前端)
```bash
cd perler-beads
npm install
npm run dev          # 开发服务器 (端口 3005)
npm run build        # 生产构建
```

### perler-beads-server (后端)
```bash
cd perler-beads-server/server
go mod tidy
go run .             # 启动后端 (端口 8012)
swag init            # 生成 Swagger 文档
```

## 开发时判断改哪里

| 需求类型 | 应该改哪个目录 |
|----------|----------------|
| 用户端界面、H5页面、用户功能 | `perler-beads/` (React) |
| 后端API、数据库、业务逻辑 | `perler-beads-server/server/` (Go) |

## 服务器部署

### 正式服务器信息
- IP: 119.29.139.249:22
- 用户: root
- 密码: Qazwsxedc123!

### 宝塔面板
- 外网面板: https://119.29.139.249:42720/a117484c
- 用户名: gvkdamqz
- 密码: Qazwsxedc123

## 进程管理规则

通过端口杀进程，避免影响其他服务：

```powershell
# 重启 perler-beads 前端 (端口 3005)
powershell -Command "Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
cd perler-beads && npm run dev

# 重启 perler-beads-server API (端口 8012)
powershell -Command "Get-NetTCPConnection -LocalPort 8012 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
cd perler-beads-server/server && go run .
```

## 浏览器控制规则

**重要**: 控制 Chrome 浏览器时，只能使用 **Chrome MCP** 工具。

### Chrome 启动方法
```powershell
powershell -ExecutionPolicy Bypass -File "D:\0.work\knowhow\claude\start_chrome_debug.ps1" perler-beads-creator
```
