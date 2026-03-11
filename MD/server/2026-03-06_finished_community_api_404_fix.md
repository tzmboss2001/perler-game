# 2026-03-06 成品社区接口404发布修复

## 问题
- 线上首页切到“成品社区”时提示“成品社区暂时不可用”。
- 根因不是前端，而是线上 `/api/v1/finished-works/public` 返回 404。

## 根因
- 服务器 `8012` 端口被历史 `nohup` 进程占用（旧二进制）。
- systemd 服务 `perler-beads.service` 一直启动失败重试（端口被占），导致新后端版本未真正生效。

## 处理
1. 用本地最新后端代码编译 Linux 二进制：`perler-beads-server-linux-amd64`。
2. 上传并替换服务器二进制：`/www/wwwroot/perler-beads-server/perler-beads-server`。
3. 停止 `perler-beads.service`。
4. 杀掉历史占用端口进程（旧 nohup 进程）。
5. 启动 `perler-beads.service`，确认服务由 systemd 正常托管并监听 `:8012`。

## 验证
- 服务器本机：`http://127.0.0.1:8012/api/v1/finished-works/public?page=1&pageSize=1` 返回 200。
- 公网域名：`http://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=3` 返回 200。
- 当前返回为空列表是正常状态（暂无公开成品数据），不再是接口不可用。

## 影响
- 首页“成品社区”不再报“暂时不可用”。
- 前后端接口已打通，后续有成品数据时会正常展示。
