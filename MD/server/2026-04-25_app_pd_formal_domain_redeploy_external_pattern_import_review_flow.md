# 2026-04-25 正式域名发布记录：外部图纸导入与风险格校对

## 发布目标

- 域名：`https://app-pd.shop888.vip`
- 发布内容：外部图纸导入入口、导入识别页、自动猜测网格、风险格高亮、编辑器逐格定位校对

## 对应代码提交

- `3b0c5490 feat: add external pattern import review flow`

## 发布前隔离与验证

### 1. 隔离发布目录

- 当前主工作区存在大量未提交改动，不适合直接发布。
- 本次在 `TEMP/release-3b0c5490` 创建隔离 worktree，仅发布提交 `3b0c5490`。

### 2. 本地验证

- `node TEST\pattern_import_utils.test.mjs`：通过
- `cmd /c npm.cmd run build`：通过

## 发布方式

本次直接使用 Python SSH 发布脚本完成正式发布：

```bash
python SCRIPT\deploy_frontend_ssh.py --host 119.29.139.249 --user root --password ***** --local-dist D:\work\web\perler-beads-creator\TEMP\release-3b0c5490\perler-beads\dist
```

说明：

- 本机验证发现 `ubuntu` 用户密码认证失败
- `root` 用户可正常 SSH 登录
- 脚本执行成功完成上传、Nginx 配置检查、HTTPS 证书检查与重载

## 脚本输出关键信息

- 临时上传目录：`/home/root/deploy_dist_1777096445`
- `nginx -t`：成功
- 证书状态：`Certificate not yet due for renewal; no action taken.`
- 最终状态：`[OK] deploy completed`

## 本次线上主资源

- `assets/index-CLx3Uf6s.js`
- `assets/index-C5FPifGG.css`
- `assets/ImportPatternPage-TE_YcnUb.js`
- `assets/CreatePage-9y4iQgv4.js`
- `assets/EditorPage-CURwjxY8.js`

## 公网验证

### 页面

- `https://app-pd.shop888.vip/mobile/home`：`200`
- `https://app-pd.shop888.vip/mobile/import-pattern`：`200`

### 资源

- `https://app-pd.shop888.vip/assets/index-CLx3Uf6s.js`：`200`
- `https://app-pd.shop888.vip/assets/ImportPatternPage-TE_YcnUb.js`：`200`

### 接口

- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1`：`200`

## 结果

- 外部图纸导入功能已发布到正式域名
- 导入识别页及其懒加载分包已确认在线可访问
- 正式站首页、导入页、公共接口均正常响应
