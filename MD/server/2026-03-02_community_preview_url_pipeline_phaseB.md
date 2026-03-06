# 社区详情标准图链路（preview_url）

日期：2026-03-02

## 改动
1. 社区作品模型新增 `preview_url` 字段。
   - 文件：`server/model/entity/community.go`
2. 社区响应结构新增 `preview_url`。
   - 文件：`server/model/response/community_resp.go`
3. 发布作品时自动生成详情标准图（`post_{id}_detail.png`）并写入 `preview_url`。
4. 详情接口读取时若 `preview_url` 缺失，会自动回填生成并持久化。
   - 文件：`server/service/community.go`

## 验证
- `go build .` 通过。

## 结果
- 社区详情页显示优先使用标准详情图，减少使用缩略图导致的失真。
