# 腾讯云 COS 图片上传功能

## 日期
2026-01-25

## 需求
保存方案时，图片上传到腾讯云 COS 对象存储，数据库只保存 URL 链接。

## 问题原因
之前保存方案时，直接把 base64 图片数据存到数据库的 `thumbnail_url` 字段，导致：
- 字段长度超限（500字符）
- 数据库臃肿

## 解决方案

### 1. 创建腾讯云 COS 存储桶
- 存储桶名称：`perler-beads-1251621644`
- 地域：`ap-guangzhou`
- 访问权限：公有读私有写

### 2. 后端修改

**新增文件：**
- `utils/upload/tencent_cos.go` - COS 上传服务
- `api/v1/upload/upload.go` - 上传 API
- `router/upload.go` - 上传路由

**API 接口：**
```
POST /api/v1/upload/image
Request: { image: "base64...", folder: "thumbnails" }
Response: { code: 0, data: { url: "https://..." } }
```

### 3. 前端修改

**新增文件：**
- `src/services/api/uploadApi.ts` - 上传 API 服务

**修改文件：**
- `src/pages/mobile/EditorPage.tsx` - 保存方案时先上传图片

**保存流程：**
```
1. 生成缩略图和原图的 base64
2. 并行上传到腾讯云 COS
3. 获取返回的 URL
4. 使用 URL 保存方案到数据库
```

## 测试结果

| 测试项 | 结果 |
|--------|------|
| 上传缩略图 | ✅ 成功 |
| 上传原图 | ✅ 成功 |
| 保存方案 | ✅ 成功 |
| 方案列表显示 | ✅ 显示 COS URL 图片 |

## COS 配置
```yaml
tencent-cos:
  bucket: "perler-beads-1251621644"
  region: "ap-guangzhou"
  secret-id: "AKIDYyzrVwZkmcKrAG9qMfniQvD1e6YnpiPt"
  secret-key: "OJ7i7cuzHNF6k9NOsCLJ4e3FDyWr57yb"
  base-url: "https://perler-beads-1251621644.cos.ap-guangzhou.myqcloud.com"
```

## 截图
- `TEMP/cos_upload_success.png` - 方案保存成功
