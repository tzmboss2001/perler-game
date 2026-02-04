# CLAUDE.md - 拼豆工坊项目

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**拼豆工坊** - 一个基于 React + TypeScript + Vite 的拼豆图案生成器。可以将照片转换为可制作的拼豆（Perler Beads）图案，支持多品牌色板、珠子统计、手动编辑等功能。

**核心特点**：纯前端实现，零 API 成本。

## 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器 (端口 3005)
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目目录

| 项目 | 路径 | 说明 |
|------|------|------|
| **前端** | `D:\work\web\perler-beads-creator\perler-beads` | React 前端 |
| **后端** | `D:\work\web\perler-beads-creator\perler-beads-server` | Go 后端 API |

## 固定端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| **perler-beads 前端** | 3005 | React 拼豆工坊 |
| **perler-beads-server 后端** | 8012 | Go API 服务 |

## 架构概述

### 核心数据流

```
用户上传/拍照 → 像素化(Canvas) → 颜色匹配(色板) → 网格图案 + 珠子统计 → 导出/编辑
```

### 目录结构

```
perler-beads/
├── public/                 # 静态资源
├── src/
│   ├── components/         # 通用组件
│   ├── pages/
│   │   └── mobile/         # 移动端页面
│   │       ├── MobileLayout.tsx   # 布局组件
│   │       ├── HomePage.tsx       # 首页
│   │       ├── CreatePage.tsx     # 创建页
│   │       └── ProfilePage.tsx    # 我的页面
│   ├── services/           # 业务服务
│   │   ├── pixelizeService.ts     # 像素化算法
│   │   └── colorMatchService.ts   # 颜色匹配
│   ├── data/               # 数据文件
│   │   └── beadColors.ts          # 珠子色板数据
│   ├── store/              # 状态管理
│   ├── styles/
│   │   └── designSystem.ts        # 设计系统
│   ├── router/             # 路由配置
│   ├── App.tsx
│   └── main.tsx
├── MD/                     # 修改记录文档
├── TEMP/                   # 临时文件
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 核心算法

1. **像素化算法** - Canvas 缩放实现降采样
2. **颜色量化算法** - 计算欧氏距离匹配最近珠子颜色
3. **颜色合并算法** - 减少颜色种类，简化图案
4. **网格渲染算法** - Canvas 绘制带网格线的图案

## 开发要求

### 基本规范
1. 请用中文回答所有内容
2. 回答前加上一句详细的模型，如【xxx 模型为白老板财富自由而努力coding】
3. 每次改完一个BUG，就添加一个MD文件到 `MD/` 目录

### 技术路线图管理
**重要**: 每次完成一个问题/任务后，必须执行以下流程：
1. 读取 `D:\work\web\perler-beads-creator\perler-beads\MD\technical_roadmap.md` 查看当前进度和下一步任务
2. **只有在用户明确确认验收通过后**，才能更新 technical_roadmap.md 的进度状态
3. 未经用户验收确认，禁止自行标记任务为"已完成"

### 目录规则
- MD 文件放到 `MD/` 目录
- 测试脚本放到 `TEST/` 目录
- 工具脚本放到 `SCRIPT/` 目录
- 临时文件放到 `TEMP/` 目录
- 没有这些目录自己创建

### 完成工作后
在完成所有回复内容的最后，用 Windows TTS 语音播报总结：
```powershell
powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('总结内容')"
```

### 需要确认时
用 Windows TTS 语音提示需要确认什么：
```powershell
powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('提示内容')"
```

### React 程序规范
- 自己运行：`npm run dev`
- 有错误自己看日志并改正
- 使用 Windows 的 taskkill 来杀掉 node 进程
- 每次启动调试要检查有没有错误

### Git 提交规范
只在用户明确要求时才提交：
```bash
git pull && git add . && git commit -m "填修改内容" && git push origin main
```

## 服务器部署

### 正式服务器信息
- IP: 119.29.139.249:22
- 用户: root
- 密码: Qazwsxedc123!

### 宝塔面板
- 外网面板: https://119.29.139.249:42720/a117484c
- 用户名: gvkdamqz
- 密码: Qazwsxedc123

### 部署方式
使用 Python paramiko 库连接 SSH 进行部署：
```python
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('119.29.139.249', username='root', password='Qazwsxedc123!')

# 执行命令
stdin, stdout, stderr = ssh.exec_command('命令')
print(stdout.read().decode())

ssh.close()
```

## 浏览器控制规则

**重要**: 控制 Chrome 浏览器时，只能使用 **Chrome MCP** 工具。

### Chrome 启动方法
```powershell
powershell -ExecutionPolicy Bypass -File "D:\0.work\knowhow\claude\start_chrome_debug.ps1" perler-beads
```

或手动启动：
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="D:\chrome\perler-beads"
```

### 禁止使用的方式
- Puppeteer
- Playwright
- 其他自动化软件

## 进程管理规则

重启服务时，通过端口杀进程：

```powershell
# 重启 perler-beads (端口 3005)
powershell -Command "Get-NetTCPConnection -LocalPort 3005 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
cd perler-beads && npm run dev
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 6 | 构建工具 |
| React Router | 6 | 路由 |
| Zustand | 5 | 状态管理 |
| Phosphor Icons | 2 | 图标库 |

## 技术方案文档

详细技术方案请参考：`D:\work\web\perler-beads-creator\perler-beads\MD\technical_roadmap.md`
