# 2026-04-22 正式域名发布：单板模式手机端总览优化

## 本次发布内容

- 发布目标：`https://app-pd.shop888.vip`
- 对应代码提交：`707ce8bd feat: optimize single-board mobile overview`
- 前端主包：
  - `assets/index-CteIEZGU.js`
  - `assets/index-C5FPifGG.css`

## 包含的改动

- 手机端单板模式新增统一的 `总览` 入口，不再只限多板图显示。
- 总览浮层改为更小的居中卡片，不再固定钉在底部。
- 总览卡片支持拖动。
- 总览标题显示当前板信息，例如 `整图总览 · 当前板 1/2`。
- 点 `<` `>` 切板后，总览中的当前板高亮与标题会同步更新。

## 发布方式

本次使用打包上传 + 远端解压同步的方式发布，避免之前直接脚本同步时出现首页或懒加载分包缺失：

1. 本地重新构建前端产物。
2. 打包生成：
   - `TEMP/deploy_dist_20260422_overview_release.tar`
3. 上传到服务器：
   - `/home/ubuntu/deploy_dist_20260422_overview_release.tar`
4. 远端解压到临时目录：
   - `/home/ubuntu/deploy_dist_20260422_overview_release`
5. 远端同步：
   - `rsync -a <tmp>/assets/ /www/wwwroot/perler-beads/assets/`
   - `rsync -a --delete --exclude assets <tmp>/ /www/wwwroot/perler-beads/`
6. 执行：
   - `nginx -t`
   - `nginx -s reload`

## 发布结果

- 远端同步命令执行成功。
- `nginx -t` 通过。
- `nginx -s reload` 成功。

## 公网验证

### HTTP 校验

- `https://app-pd.shop888.vip` 返回 `200`
- `https://app-pd.shop888.vip/mobile/home` 返回 `200`
- `https://app-pd.shop888.vip/api/v1/finished-works/public?page=1&pageSize=1` 返回 `200`
- `https://app-pd.shop888.vip/assets/index-CteIEZGU.js` 返回 `200`

### MCP 页面校验

- 在正式站打开 `https://app-pd.shop888.vip/mobile/home`
- 首页已正常渲染：
  - 顶部导航
  - 社区图片卡片
  - 底部导航
- 首页关键动态资源均返回 `200`
- 控制台未出现阻断页面打开的分包 `404`

## 备注

- 当前首页仍有一条非阻断控制台告警：表单元素缺少 `id/name`。
- 该告警不会影响本次单板模式手机端总览优化上线验证。
