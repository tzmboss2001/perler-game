# 2026-03-22 project bead_data packet size fix

## 问题
- 重新用 MCP 复测“保存并开始制作”后，前端仍然提示云端保存异常。
- 这次后端返回的真实错误不是坏连接，而是：
  - `Error 1153 (08S01): Got a packet bigger than 'max_allowed_packet' bytes; invalid connection`
- 根因是项目方案保存时把整张图的每颗豆子都按完整对象写入 `bead_data` JSON，数据量过大，插入 MySQL 时超过了 `max_allowed_packet`。

## 修复
1. `server/service/project.go`
- 保存项目时，把 `bead_data` 先整体 `json.Marshal`，再做 `gzip + base64` 压缩后入库。
- 数据库存储格式改成：
  - `{"encoding":"gzip-base64-json","payload":"..."}`
- `GetByID` 读取项目详情时透明解压，还原成前端原本需要的 `width/height/beads` 结构。
- `Update` 也统一走同一套压缩逻辑。

2. `server/service/community.go`
- 从项目方案回填社区 `bead_data` 时，先走同一套解压逻辑，避免社区链路读取到压缩包装对象。

## 结果
- 这次修复的目标是降低项目方案保存到 MySQL 时的 JSON 体积，避免再次触发 `max_allowed_packet`。
- 前端接口结构不需要改，项目详情返回给前端时仍是原始 `bead_data` 对象。
