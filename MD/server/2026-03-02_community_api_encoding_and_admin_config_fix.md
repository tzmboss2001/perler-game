# 社区API乱码与审核权限配置修复

日期：2026-03-02  
文件：`perler-beads-server/server/api/v1/community/community.go`

## 问题
- 旧文件存在多处乱码引号截断，导致字符串未闭合并引发编译失败。
- 社区审核权限为硬编码 `userID == 1`，上线后不便维护。

## 处理
1. 全量重写社区 API 文件，保留原有接口能力并清理乱码文本。
2. 保留并接入审核接口：
   - `GET /api/v1/community/moderation/posts`
   - `POST /api/v1/community/moderation/posts/:id/review`
3. 审核权限改为环境变量白名单：`COMMUNITY_ADMIN_IDS`（逗号分隔）。
   - 未配置时默认仅 `userID=1`。
4. 执行 `gofmt` 与 `go build` 验证。

## 验证
- 命令：`go build .`
- 结果：通过。

## 影响
- 社区 API 稳定性恢复。
- 审核权限可运维配置，减少后续改代码成本。
