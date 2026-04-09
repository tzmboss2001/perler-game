# 2026-03-30 方案创建支持已压缩 bead_data 直存

## 问题
- 客户端在最大宽度保存方案时，请求体中的 `bead_data` 体积过大。
- 服务端原逻辑会无条件再次压缩 `bead_data`，不支持客户端预压缩传输。

## 修改
- 在 `server/service/project.go` 中新增 `normalizeProjectBeadData`。
- 当 `bead_data` 已经是 `{ encoding: "gzip-base64-json", payload: "..." }` 结构时：
  - 直接按现成压缩结构入库。
- 当 `bead_data` 仍是原始 JSON 时：
  - 继续走原有 `compressProjectBeadData` 压缩流程。
- `Create` 和 `Update` 两条链路都改为使用该归一化逻辑。

## 结果
- 客户端可以先压缩 `bead_data` 再提交，显著减小 `project/create` 请求体。
- 读取方案详情时仍由现有展开逻辑透明解压，返回给前端的仍是原始珠子数据。
