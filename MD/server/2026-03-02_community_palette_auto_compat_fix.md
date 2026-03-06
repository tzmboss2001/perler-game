# 2026-03-02 社区发布色系自动兼容修复

## 目标
系统自动兼容历史/新作品色系，不增加用户操作成本：
- 发布时自动携带色系元数据。
- 服务端兜底推断色系并入库。
- 社区详情按 `hex` 优先渲染，避免色号体系变更导致失真。

## 改动
### 1. 模型与请求响应字段贯通
- `perler-beads-server/server/model/entity/community.go`
  - `CommunityPost` 新增：
    - `PaletteBrand` (`palette_brand`)
    - `PaletteVer` (`palette_version`)
    - `PaletteName` (`palette_name`)
- `perler-beads-server/server/model/request/community_req.go`
  - `CreateCommunityPostRequest` 新增：
    - `PaletteBrand`
    - `PaletteVersion`
    - `PaletteName`
- `perler-beads-server/server/model/response/community_resp.go`
  - 列表与详情响应新增：
    - `palette_brand`
    - `palette_version`
    - `palette_name`

### 2. 社区服务逻辑
- 文件：`perler-beads-server/server/service/community.go`
- 修复并增强：
  - 清理了误插入的 `` `t`` 脏字符，恢复可编译。
  - `GetPosts` / `GetPostByID` 返回 `palette_*` 字段。
  - `CreatePost`：
    - 优先使用前端传入 `palette_*`
    - 缺失时自动 `inferPaletteMetaFromBeadData(req.BeadData)` 推断并写入
  - 新增 `inferPaletteMetaFromBeadData`（后端兜底推断）。
  - 修复 `ensurePostBeadHex` 函数声明被注释吞掉的问题。

### 3. 运行验证
1. `go build .`（目录：`perler-beads-server/server`）通过。
2. 重启后端服务，健康检查 `GET /health` 返回 `200`。
3. 使用账号 `test@example.com` 发布新社区作品（接口自动化）：
   - 新作品详情返回：
     - `palette_brand: "unknown"`
     - `palette_version: "2026-03"`
     - `palette_name: "UNKNOWN 2026-03"`
   - `bead_data.beads[0].hex` 有值（用于稳定渲染）。
4. 列表接口可返回 `palette_*`。

## 结论
- 色系兼容逻辑已自动化，不需要用户额外操作。
- 历史作品通过 `hex` 回填与前端 fallback 显示机制，详情渲染稳定性已提升。
