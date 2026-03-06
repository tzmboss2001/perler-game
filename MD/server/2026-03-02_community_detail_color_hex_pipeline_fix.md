# 2026-03-02 社区发布颜色信息补充与后端缩略图渲染修复

## 问题
- 社区 `bead_data` 历史上仅存 `colorId`，当 `colorId` 不在当前色表时，后续渲染无法还原真实颜色。

## 修复
### 前端发布侧
- 文件：`perler-beads/src/services/thumbnailService.ts`
- `convertBeadPixelDataToCommunityFormat` 新增写入 `hex` 字段：
  - 每个 bead 除 `x/y/colorId` 外，额外保存 `hex`

### 后端缩略图渲染侧
- 文件：`perler-beads-server/server/service/community.go`
- `buildThumbnailFromBeadData` 渲染时优先读 bead 的 `hex`：
  - 若 `hex` 合法，使用真实颜色
  - 否则回退 `colorId` 哈希色
- 新增 `parseHexColor` 解析函数。

## 结果
- 新发布作品在社区链路中可携带真实颜色信息。
- 后端生成缩略图时优先使用真实颜色，减少色偏。

## 验证
- `go build .` 通过。
- 后端重启后 `8012` 接口可访问（200）。
