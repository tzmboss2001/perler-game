# 项目/方案保存功能实现

**日期**: 2026-01-25
**类型**: 新功能
**状态**: 已完成

## 功能描述

实现项目/方案保存功能，让用户可以保存、加载和继续制作拼豆图案。

### 核心功能
1. 用户点击"开始制作"时弹窗命名并保存方案
2. 方案包含：原图、珠子数据、设置参数、制作进度
3. "我的方案"列表页面
4. 继续制作/删除方案
5. 自动保存制作进度（防抖 2 秒）

## 修改的文件

### 前端 (perler-beads)

| 文件 | 操作 | 说明 |
|------|------|------|
| `vite.config.ts` | 修改 | 添加 API 代理配置 |
| `src/services/api/projectApi.ts` | 新建 | API 服务层，封装后端接口调用 |
| `src/components/SaveProjectModal.tsx` | 新建 | 保存方案弹窗组件 |
| `src/pages/mobile/EditorPage.tsx` | 修改 | 集成保存功能，点击"开始制作"显示弹窗 |
| `src/pages/mobile/MakingPage.tsx` | 修改 | 添加进度自动保存（防抖） |
| `src/pages/mobile/ProfilePage.tsx` | 修改 | 添加"我的方案"列表，支持继续制作/删除 |

### 后端 (perler-beads-server)

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/model/entity/project.go` | 新建 | Project 数据模型，支持 JSON 字段 |
| `server/model/request/project_req.go` | 新建 | 请求 DTO |
| `server/model/response/project_resp.go` | 新建 | 响应 DTO |
| `server/service/project.go` | 新建 | 业务逻辑层 |
| `server/api/v1/project/project.go` | 修改 | 完善 6 个 API 端点实现 |
| `server/initialize/gorm.go` | 修改 | 添加 AutoMigrate |
| `server/initialize/router.go` | 修改 | 将 Project 路由移到公开组（支持游客模式） |

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/project/create` | POST | 创建方案 |
| `/api/v1/project/list` | GET | 获取方案列表 |
| `/api/v1/project/{id}` | GET | 获取方案详情 |
| `/api/v1/project/{id}` | PUT | 更新方案 |
| `/api/v1/project/{id}` | DELETE | 删除方案 |
| `/api/v1/project/{id}/progress` | PUT | 更新制作进度 |

## 数据结构

### Project 模型
```go
type Project struct {
    ID            uint      `json:"id"`
    UserID        uint      `json:"user_id"`        // 用户ID（可选）
    DeviceID      string    `json:"device_id"`      // 设备ID（游客模式）
    Name          string    `json:"name"`           // 方案名称
    ThumbnailURL  string    `json:"thumbnail_url"`  // 缩略图
    OriginalImage string    `json:"original_image"` // 原图Base64
    BeadData      JSON      `json:"bead_data"`      // 珠子数据
    Settings      JSON      `json:"settings"`       // 设置参数
    Progress      JSON      `json:"progress"`       // 制作进度
    Status        int       `json:"status"`         // 0:进行中 1:已完成
}
```

### Settings 结构
```json
{
  "gridSize": 32,
  "colorCount": 96,
  "saturationBoost": 30,
  "vibrancyPreference": 40
}
```

### Progress 结构
```json
{
  "mode": "row",
  "currentIndex": 5,
  "completedItems": [0,1,2,3,4],
  "blockSize": 10
}
```

## 用户流程

```
EditorPage → 点击"开始制作" → 弹窗命名方案 → 保存到服务器 → 跳转制作页
                                                    ↓
ProfilePage → 查看"我的方案" → 点击方案 → 继续制作 / 删除
```

## 技术要点

1. **游客模式**：使用 DeviceID 标识用户，存储在 localStorage
2. **图片存储**：暂用 Base64，后期可改为 OSS
3. **进度自动保存**：使用防抖（2秒），避免频繁请求
4. **缩略图生成**：使用 Canvas 渲染小尺寸图案

## 验证步骤

### 后端验证
1. 启动后端：`cd server && go run .`
2. 检查数据库表是否创建：`projects` 表

### 前端验证
1. 启动前端：`npm run dev`
2. 创建页选择图片，生成图案
3. 点击"开始制作"，弹出保存弹窗
4. 输入名称保存，跳转制作页
5. 在"我的"页面查看方案列表
6. 点击方案继续制作
7. 测试删除功能

## 编译验证

- ✅ 后端 Go 编译通过
- ✅ 前端 Vite 构建通过
