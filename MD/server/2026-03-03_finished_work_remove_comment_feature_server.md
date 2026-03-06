# 2026-03-03 去掉成品评论功能（服务端）

## 变更背景
- 用户要求取消成品评论功能。

## 服务端调整
- 移除评论相关 API 入口：
  - `GET /api/v1/finished-works/:id/comments`
  - `POST /api/v1/finished-works/:id/comments`
- 相关方法从 `finished_work` API 文件中移除。
- 路由文件同步移除评论路径。

## 影响范围
- 点赞、举报、作者删除不受影响。
- 旧评论数据表仍可保留，不对外提供接口。

## 验证
- `go build .` 通过。
