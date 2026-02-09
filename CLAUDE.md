# CLAUDE.md - 云拼豆游戏项目

This file provides guidance to Claude Code when working with code in this repository.

---

## 一、通用开发原则（所有项目通用）

### 1.1 基本规范
1. **请用中文回答所有内容**
2. **回答前加上模型说明**，如【xxx 模型为白老板财富自由而努力coding】
3. **每次改完一个功能/BUG**，在 `MD/` 目录添加开发日志

### 1.2 目录规则
```
项目根目录/
├── MD/              # 修改记录文档
│   ├── client/      # 客户端相关MD
│   └── server/      # 服务端相关MD
├── TEST/            # 测试脚本或代码
├── SCRIPT/          # 实用工具脚本
└── TEMP/            # 临时文件
```
- 没有这些目录自己创建

### 1.3 TTS 语音播报

**完成工作后**（在整个回复的最末尾）：
```powershell
powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('总结内容')"
```

**需要用户确认时**：
```powershell
powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('提示内容')"
```

### 1.4 React 程序规范
- 自己运行：`npm run dev`
- 有错误自己看日志并改正
- 使用 Windows 的 taskkill 来杀掉 node 进程
- 每次启动调试要检查有没有错误，没错误再让用户操作

### 1.5 Git 提交规范
**只在用户明确要求时才提交**：
```bash
git pull && git add . && git commit -m "填修改内容" && git push origin main
```
改完BUG先让用户确认，确认后再提交。

### 1.6 权限问题处理
遇到权限问题，**马上停止**，然后告诉用户要怎么执行。

### 1.7 进度管理原则
- **只有在用户明确确认验收通过后**，才能更新进度状态
- 未经用户验收确认，禁止自行标记任务为"已完成"

---

## 二、进程管理规则

**重要**: 重启服务时，必须通过端口杀进程，不要直接杀 node 进程（避免影响其他 node 服务）

### 通过端口杀进程的命令
```powershell
# 查找占用端口的进程 PID
netstat -ano | findstr :端口号

# 杀掉指定 PID 的进程
taskkill //F //PID <PID号>

# 一行命令（PowerShell）- 杀掉占用指定端口的进程
powershell -Command "Get-NetTCPConnection -LocalPort 端口号 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
```

### 重启 perler-game (端口 3006)
```bash
netstat -ano | grep :3006 | grep LISTEN | awk '{print $5}' | xargs -r taskkill //F //PID
cd perler-game && npm run dev
```

---

## 三、浏览器控制规则

**重要**: 控制 Chrome 浏览器时，只能使用 **Chrome MCP** 工具。

### 禁止使用的方式
- Puppeteer
- Playwright
- 其他自动化软件
- 手写的 WebSocket/CDP 脚本

### Chrome 启动方法
```powershell
powershell -ExecutionPolicy Bypass -File "D:\0.work\knowhow\claude\start_chrome_debug.ps1" perler-game
```

或手动启动：
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="D:\chrome\perler-game"
```

### AI 操作流程
1. 先关闭所有 Chrome: `taskkill //F //IM chrome.exe`
2. 执行启动脚本
3. 使用 `mcp__chrome-devtools__navigate_page` 导航到目标 URL
4. 使用其他 Chrome MCP 工具进行操作

---

## 四、服务器部署信息

### 正式服务器
- IP: 119.29.139.249:22
- 用户: root
- 密码: Qazwsxedc123!

### 宝塔面板
- 外网面板: https://119.29.139.249:42720/a117484c
- 用户名: gvkdamqz
- 密码: Qazwsxedc123

### 服务器环境
| 项目 | 版本/信息 |
|------|-----------|
| 操作系统 | Ubuntu 24.04 LTS |
| Node.js | v22.11.0 |
| MySQL | 5.7.44 (端口 3306, 密码：RmFRQ3PtckP8XRzA) |
| Redis | 端口 6379, 密码：GTnxPMHyNaajZby4 |
| Go | go1.25.4 (路径: /usr/local/btgo) |

### 部署方式
```python
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('119.29.139.249', username='root', password='Qazwsxedc123!')
stdin, stdout, stderr = ssh.exec_command('命令')
print(stdout.read().decode())
ssh.close()
```

---

## 五、项目专属信息

### 5.1 项目概述

**云拼豆** - 一款模拟实体拼豆完整体验的数字化创作游戏。

核心理念：**失败不是惩罚，是内容**

### 5.2 项目目录

| 项目 | 路径 | 说明 |
|------|------|------|
| **游戏前端** | `D:\work\web\perler-game` | React 前端 |
| **参考项目** | `D:\work\web\perler-beads-creator\perler-beads` | 拼豆工坊（可复用资源） |

### 5.3 固定端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| **perler-game 前端** | 3006 | React 云拼豆游戏 |
| **perler-game 后端** | 8013 | Go API（后续阶段） |

### 5.4 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器 (端口 3006)
npm run dev

# 构建生产版本
npm run build
```

### 5.5 核心模块说明

| 模块 | 文件 | 说明 |
|------|------|------|
| BeadBoard | `src/core/BeadBoard.ts` | 拼豆画布管理 |
| IroningSystem | `src/core/IroningSystem.ts` | 熨烫模拟系统 |
| FailureEngine | `src/core/FailureEngine.ts` | 翻车计算引擎 |
| Effects | `src/effects/` | Canvas特效模块 |

### 5.6 核心算法

**风险值计算**：
```
风险值 = 温度风险 × 0.4 + 时间偏差 × 0.3 + 轨迹不均 × 0.3
```

**失败类型**：
1. 半生不熟（undercooked）- 低温/时间短
2. 局部融化（partial_melt）- 轨迹不均
3. 整体塌陷（collapse）- 高温+长时间
4. 颜色烧焦（burned）- 高温
5. 粘连拉扯（sticky）- 抬起慢

### 5.7 可复用资源

从拼豆工坊复用：
| 文件 | 路径 | 复用方式 |
|------|------|---------|
| 珠子颜色数据 | `perler-beads/src/data/beadColors.ts` | 直接复制 |
| 设计系统 | `perler-beads/src/styles/designSystem.ts` | 参考修改 |
| Toast组件 | `perler-beads/src/components/Toast/` | 直接复制 |

### 5.8 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 6 | 构建工具 |
| Zustand | 5 | 状态管理 |
| Canvas 2D | - | 游戏渲染 |

---

## 六、开发路线图

详见：`ROADMAP.md`

当前阶段：**Phase 1 - MVP核心功能**

---

## 七、关联项目端口汇总

| 项目 | 前端端口 | 后端端口 |
|------|---------|---------|
| perler-beads（拼豆工坊） | 3005 | 8012 |
| **perler-game（云拼豆）** | **3006** | **8013** |
| gif-creator | 3000 | 8011 |
