# 社区审核链路冒烟脚本

日期：2026-03-02

## 新增
- `TEST/community_moderation_smoke.ps1`

## 能力
1. 拉取审核列表
2. 拉取审核日志
3. 触发详情图回填
4. 可选：指定作品执行审核通过动作（传 `-PostId`）

## 使用
```powershell
powershell -ExecutionPolicy Bypass -File TEST\community_moderation_smoke.ps1 -ApiBase "http://localhost:8888" -AdminToken "你的token"
```
